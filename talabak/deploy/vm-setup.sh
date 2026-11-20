#!/usr/bin/env bash
# تثبيت «طلبك معنا» على خادم Ubuntu مجاني (Oracle Cloud Always Free أو Google Cloud e2-micro) بإعدادات أمان مشدَّدة.
# الاستخدام (من داخل المجلد talabak بعد استنساخ المستودع):
#   sudo bash deploy/vm-setup.sh                               → رابط HTTPS تلقائي مجاني  https://1-2-3-4.sslip.io
#   sudo bash deploy/vm-setup.sh talabak.example.com           → نطاقك الخاص
#   sudo bash deploy/vm-setup.sh --staff-allow="203.0.113.5 198.51.100.0/24"   → حصر لوحة الموظفين/الإدارة بعناوين محددة (اختياري)
# خادم منزلي/مكتبي (لابتوب) خلف راوتر بلا منافذ مفتوحة:
#   sudo bash deploy/vm-setup.sh --mode=tailscale --laptop [--funnel-public-only] [--heartbeat-url=https://hc-ping.com/xxxx]
#   (اختياري) TS_AUTHKEY=tskey-... sudo -E bash deploy/vm-setup.sh ...   ← يربط Tailscale دون خطوة تسجيل دخول يدوية
# آمن للتكرار: لا يعيد تعيين كلمة مرور مدير موجود، ولا يمس قاعدة البيانات ولا الأسرار المولَّدة.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
[ "$(id -u)" = 0 ] || { echo "شغّل السكربت بـ sudo"; exit 1; }
# يحدث أن يمسك unattended-upgrades قفل apt بعد التثبيت الأول؛ ننتظره بدل الفشل
echo 'DPkg::Lock::Timeout "900";' > /etc/apt/apt.conf.d/99-talabak-lock-timeout

DOMAIN=""; STAFF_ALLOW=""; MODE="caddy"; LAPTOP=0; FUNNEL_ONLY=0; HEARTBEAT=""
for a in "$@"; do
  case "$a" in
    --staff-allow=*) STAFF_ALLOW="${a#*=}" ;;
    --mode=*) MODE="${a#*=}" ;;
    --laptop) LAPTOP=1 ;;
    --funnel-public-only) FUNNEL_ONLY=1 ;;
    --heartbeat-url=*) HEARTBEAT="${a#*=}" ;;
    -*) echo "خيار غير معروف: $a"; exit 1 ;;
    *) DOMAIN="$a" ;;
  esac
done
[ "$MODE" = caddy ] || [ "$MODE" = tailscale ] || { echo "--mode يجب أن يكون caddy أو tailscale"; exit 1; }
APP_SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR=/opt/talabak
DATA_DIR=/var/lib/talabak
ENV_FILE=/etc/talabak.env
SSH_USER="${SUDO_USER:-ubuntu}"

echo "▶ ١/٩ تحديث الحزم"
apt-get update -y
apt-get install -y curl ca-certificates gnupg apt-transport-https openssl

echo "▶ ٢/٩ Node.js 22"
install_node_tarball() {   # احتياطي: النسخة الرسمية من nodejs.org بالتحقق من بصمة SHA-256
  echo "NodeSource غير متاح لهذا الإصدار — أنزّل Node 22 من nodejs.org"
  local base="https://nodejs.org/dist/latest-v22.x" tmp; tmp="$(mktemp -d)"
  local line; line="$(curl -fsSL "$base/SHASUMS256.txt" | grep 'linux-x64.tar.xz$' | head -1)"
  [ -n "$line" ] || { echo "تعذّر قراءة بصمات nodejs.org"; return 1; }
  local sum="${line%% *}" file="${line##* }"
  curl -fsSL "$base/$file" -o "$tmp/$file"
  echo "$sum  $tmp/$file" | sha256sum -c - >/dev/null || { echo "فشل التحقق من بصمة Node — أُلغي التثبيت"; return 1; }
  apt-get install -y xz-utils
  tar -xJf "$tmp/$file" -C /usr/local --strip-components=1
  rm -rf "$tmp"
}
if ! command -v node >/dev/null || ! node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)'; then
  if ! { curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs; }; then install_node_tarball; fi
fi
NODE_BIN="$(command -v node)"
if ! node -e "1" >/dev/null 2>&1; then
  echo "✘ Node.js لا يعمل على معالج هذا الجهاز (غالبًا معالج قديم بلا SSE4.2، مثل Core 2 Duo). استخدم جهازًا أحدث أو أخبرني بالنموذج لأجد حلًّا."; exit 1
fi
if [ "$LAPTOP" = 1 ] && ! grep -q sse4_2 /proc/cpuinfo; then echo "تحذير: المعالج بلا SSE4.2 — قد تظهر أعطال غامضة."; fi
node -v

echo "▶ ٣/٩ نسخ التطبيق (الشيفرة للقراءة فقط على حساب الخدمة؛ البيانات وحدها قابلة للكتابة)"
id talabak >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin talabak
mkdir -p "$APP_DIR" "$DATA_DIR"
if [ "$APP_SRC" != "$APP_DIR" ]; then
  tar --exclude=./data --exclude=./node_modules --exclude=./.git -C "$APP_SRC" -cf - . | tar -C "$APP_DIR" -xf -
fi
chown -R root:talabak "$APP_DIR"; chmod -R g-w,o-rwx "$APP_DIR"
chown -R talabak:talabak "$DATA_DIR"; chmod 700 "$DATA_DIR"

echo "▶ ٤/٩ الأسرار (مفتاح التطبيق + عبارة تشفير النسخ الاحتياطية) في ملف بصلاحية root فقط"
NEW_SECRETS=0
if [ ! -f "$ENV_FILE" ]; then
  umask 077
  { echo "APP_SECRET=$(openssl rand -hex 32)"; echo "BACKUP_PASSPHRASE=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-28)"; } > "$ENV_FILE"
  NEW_SECRETS=1
fi
NEW_TOPIC=0
if ! grep -q '^NTFY_TOPIC=' "$ENV_FILE"; then echo "NTFY_TOPIC=$(openssl rand -hex 12)" >> "$ENV_FILE"; NEW_TOPIC=1; fi
if [ -n "$HEARTBEAT" ]; then sed -i '/^HEARTBEAT_URL=/d' "$ENV_FILE"; echo "HEARTBEAT_URL=$HEARTBEAT" >> "$ENV_FILE"; fi
chown root:root "$ENV_FILE"; chmod 600 "$ENV_FILE"

# أداة إدارة تعمل بنفس بيئة الخدمة:  sudo talabak-admin create-admin | reset-2fa --username=x | verify-audit | backup | restore <ملف>
cat > /usr/local/bin/talabak-admin <<'WRAP'
#!/usr/bin/env bash
[ "$(id -u)" = 0 ] || { echo "استخدم sudo"; exit 1; }
[ -n "${1:-}" ] || { echo "الاستخدام: sudo talabak-admin <create-admin|reset-2fa|verify-audit|backup|restore|decrypt-backup> [خيارات]"; exit 1; }
set -a; . /etc/talabak.env; set +a
export DATA_DIR=/var/lib/talabak
cd /opt/talabak && exec sudo -u talabak --preserve-env=APP_SECRET,BACKUP_PASSPHRASE,DATA_DIR node --no-warnings "scripts/$1.js" "${@:2}"
WRAP
chmod 750 /usr/local/bin/talabak-admin; chown root:root /usr/local/bin/talabak-admin

echo "▶ ٥/٩ خدمة systemd معزولة (تعمل تلقائيًا وتعيد التشغيل عند الأعطال)"
cat > /etc/systemd/system/talabak.service <<UNIT
[Unit]
Description=Talabak Maana (KPTC)
After=network-online.target
Wants=network-online.target

[Service]
User=talabak
Group=talabak
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=DATA_DIR=$DATA_DIR
Environment=TRUST_PROXY=1
Environment=COOKIE_SECURE=1
Environment=BACKUP_EVERY_HOURS=6
$( [ "$FUNNEL_ONLY" = 1 ] && echo 'Environment=FUNNEL_PUBLIC_ONLY=1' )
ExecStart=$NODE_BIN --no-warnings server/index.js
Restart=always
RestartSec=3
# --- عزل ---
UMask=0077
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$DATA_DIR
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
ProtectClock=true
RestrictNamespaces=true
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
SystemCallArchitectures=native
LimitCORE=0
LimitNOFILE=4096
MemoryMax=600M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload

# المدير الأول: فقط إن لم يوجد مدير (لا نعيد تعيين كلمة مرور موجودة)
HAS_ADMIN=$(sudo -u talabak env DATA_DIR="$DATA_DIR" node --no-warnings -e "
try { const {DatabaseSync}=require('node:sqlite'); const d=new DatabaseSync(process.env.DATA_DIR+'/talabak.db',{readOnly:true});
console.log(d.prepare(\"select count(*) n from users where role='admin'\").get().n) } catch { console.log(0) }")
ADMIN_PW=""
FIRST_ADMIN_FILE=/root/talabak-first-admin.txt
if [ "$HAS_ADMIN" = "0" ]; then
  OUT=$(talabak-admin create-admin --username=admin --name="مدير النظام")
  ADMIN_PW=$(echo "$OUT" | grep -E '^\s+\S{10,}$' | tr -d ' ')
  # تُحفظ فورًا حتى لا تضيع إن انقطع التثبيت لاحقًا (ملف بصلاحية root فقط؛ احذفه بعد أول دخول)
  ( umask 077; printf 'admin\n%s\n' "$ADMIN_PW" > "$FIRST_ADMIN_FILE" )
  echo "   المدير الأول أُنشئ — كلمة المرور المؤقتة (احفظها الآن): $ADMIN_PW"
elif [ -f "$FIRST_ADMIN_FILE" ]; then
  ADMIN_PW="$(sed -n 2p "$FIRST_ADMIN_FILE")"
  echo "   (استُعيدت كلمة المرور المؤقتة المحفوظة سابقًا في $FIRST_ADMIN_FILE)"
fi
systemctl enable --now talabak
systemctl restart talabak

# مراقب ذاتي: إن لم يستجب التطبيق (تجمّد) 3 مرات متتالية يُعاد تشغيله، ويصلك تنبيه إن كان ntfy مفعّلًا
cat > /usr/local/bin/talabak-watchdog <<'WD'
#!/usr/bin/env bash
for i in 1 2 3; do curl -fsS --max-time 5 http://127.0.0.1:3000/healthz >/dev/null 2>&1 && exit 0; sleep 5; done
logger -t talabak-watchdog "healthz فشل 3 مرات — إعادة تشغيل الخدمة"
systemctl restart talabak
set -a; . /etc/talabak.env; set +a
[ -n "${NTFY_TOPIC:-}" ] && curl -fsS --max-time 8 -H "Title: talabak restarted" -H "Priority: 4" -d "Watchdog restarted the service (health check failed)" "https://ntfy.sh/$NTFY_TOPIC" >/dev/null 2>&1 || true
WD
chmod 750 /usr/local/bin/talabak-watchdog
cat > /etc/systemd/system/talabak-watchdog.service <<'UNIT'
[Unit]
Description=Talabak health watchdog
[Service]
Type=oneshot
ExecStart=/usr/local/bin/talabak-watchdog
UNIT
cat > /etc/systemd/system/talabak-watchdog.timer <<'UNIT'
[Unit]
Description=Run Talabak health watchdog every minute
[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now talabak-watchdog.timer

if [ "$MODE" = caddy ]; then
echo "▶ ٦/٩ Caddy (HTTPS تلقائي) + ترويسات أمان + حد لحجم الطلب"
if ! command -v caddy >/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring || true
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
if [ -z "$DOMAIN" ]; then
  IP=$(curl -4 -fsS https://api.ipify.org)
  DOMAIN="${IP//./-}.sslip.io"   # نطاق مجاني يشير تلقائيًا إلى عنوان IP
fi
BLOCK=""
if [ -n "$STAFF_ALLOW" ]; then
  BLOCK="	@blocked {
		path /staff /staff/* /api/staff/* /api/admin/* /api/auth/*
		not remote_ip $STAFF_ALLOW
	}
	respond @blocked \"غير مسموح\" 403"
fi
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode gzip
	header {
		-Server
		X-Content-Type-Options "nosniff"
	}
	request_body {
		max_size 300KB
	}
$BLOCK
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Forwarded-For {remote_host}
	}
}
CADDY
caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 || { echo "تحذير: إعداد Caddy غير صالح"; caddy validate --config /etc/caddy/Caddyfile || true; }
systemctl enable caddy
systemctl restart caddy
else
echo "▶ ٦/٩ Tailscale (رابط HTTPS عام بلا فتح أي منفذ في الراوتر)"
if ! command -v tailscale >/dev/null; then curl -fsSL https://tailscale.com/install.sh | sh; fi
systemctl enable --now tailscaled
TS_OK=0
if [ -n "${TS_AUTHKEY:-}" ]; then
  if tailscale up --authkey="$TS_AUTHKEY" --ssh --hostname=talabak; then TS_OK=1; else echo "تعذّر tailscale up بالمفتاح — اتبع الخطوات اليدوية أدناه"; fi
fi
fi

if [ "$MODE" = caddy ]; then
echo "▶ ٧/٩ جدار الحماية: المنفذان 80 و443 (+SSH فقط)"
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp; ufw allow 443/tcp
fi
if command -v iptables >/dev/null; then   # صور Oracle تحجب كل شيء ما عدا SSH افتراضيًا
  for p in 80 443; do iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport $p -j ACCEPT; done
  apt-get install -y iptables-persistent netfilter-persistent >/dev/null 2>&1 || true
  netfilter-persistent save >/dev/null 2>&1 || true
fi
else
echo "▶ ٧/٩ جدار الحماية: لا شيء مفتوح للإنترنت؛ SSH من الشبكة المحلية وTailscale فقط"
apt-get install -y ufw
ufw default deny incoming; ufw default allow outgoing
ufw allow in on tailscale0
ufw allow from 192.168.0.0/16 to any port 22 proto tcp
ufw allow from 10.0.0.0/8 to any port 22 proto tcp
ufw --force enable
fi

echo "▶ ٨/٩ تشديد SSH + fail2ban"
AK="/home/$SSH_USER/.ssh/authorized_keys"
if [ -s "$AK" ]; then
  # الاسم 00- ليُقرأ قبل إعدادات السحابة (أول قيمة هي المعتمدة)
  cat > /etc/ssh/sshd_config.d/00-talabak.conf <<'SSHD'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
SSHD
  if sshd -t; then systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true; else rm -f /etc/ssh/sshd_config.d/00-talabak.conf; echo "تحذير: إعداد SSH غير صالح — أُلغي"; fi
else
  echo "تحذير: لم أجد مفتاح SSH للمستخدم $SSH_USER — لم أعطّل كلمات المرور في SSH حتى لا أقفلك خارج الخادم."
fi
apt-get install -y fail2ban
mkdir -p /etc/fail2ban/jail.d
cat > /etc/fail2ban/jail.d/talabak.local <<'F2B'
[sshd]
enabled = true
maxretry = 4
findtime = 10m
bantime = 1h
F2B
systemctl enable --now fail2ban
systemctl restart fail2ban

if [ "$LAPTOP" = 1 ]; then
echo "▶ إعدادات اللابتوب كخادم: لا نوم، يعمل والغطاء مغلق، تبريد، إيقاف آمن عند نفاد البطارية"
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
mkdir -p /etc/systemd/logind.conf.d
printf '[Login]\nHandleLidSwitch=ignore\nHandleLidSwitchExternalPower=ignore\nHandleLidSwitchDocked=ignore\nIdleAction=ignore\n' > /etc/systemd/logind.conf.d/talabak-lid.conf
apt-get install -y thermald upower lm-sensors || true
# الواي فاي: إيقاف توفير الطاقة (يقطع الاتصال كثيرًا مع تعريفات Broadcom) — يفضَّل كابل الشبكة إن أمكن
mkdir -p /etc/NetworkManager/conf.d
printf '[connection]\nwifi.powersave = 2\n' > /etc/NetworkManager/conf.d/99-talabak-wifi.conf
systemctl restart NetworkManager 2>/dev/null || true
apt-get install -y mbpfan 2>/dev/null && systemctl enable --now mbpfan || echo "ملاحظة: حزمة mbpfan (تحكم مراوح ماك) غير متاحة — راقب الحرارة بـ sensors"
# عند بلوغ البطارية مستوى حرجًا: إيقاف تشغيل نظيف (يحمي قاعدة البيانات)
if [ -f /etc/UPower/UPower.conf ]; then
  sed -i 's/^CriticalPowerAction=.*/CriticalPowerAction=PowerOff/; s/^PercentageAction=.*/PercentageAction=8/; s/^PercentageCritical=.*/PercentageCritical=10/; s/^PercentageLow=.*/PercentageLow=20/' /etc/UPower/UPower.conf
  systemctl restart upower || true
fi
systemctl restart systemd-logind || true
fi

echo "▶ ٩/٩ تحديثات الأمان التلقائية + سجلات محدودة الحجم"
apt-get install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT
cat > /etc/apt/apt.conf.d/52talabak-unattended <<'APT'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "01:30";
APT
mkdir -p /etc/systemd/journald.conf.d && printf '[Journal]\nSystemMaxUse=200M\nMaxRetentionSec=1month\n' > /etc/systemd/journald.conf.d/talabak.conf
systemctl restart systemd-journald || true

sleep 3
echo
echo "════════════════════════════════════════════════════════════"
if [ "$MODE" = caddy ]; then
  echo " تم. رابط التطبيق:  https://$DOMAIN"
  echo " لوحة الموظفين:     https://$DOMAIN/staff"
else
  echo " تم تثبيت التطبيق (يعمل محليًا على المنفذ 3000). الخطوات اليدوية المتبقية لإظهاره على الإنترنت:"
  if [ "${TS_OK:-0}" = 1 ]; then echo "   ١) تم ربط Tailscale تلقائيًا (الاسم: talabak)"; else echo "   ١) sudo tailscale up --ssh --hostname=talabak     ← افتح الرابط الذي يظهر وسجّل الدخول بحسابك"; fi
  echo "   ٢) في https://login.tailscale.com/admin/dns فعّل MagicDNS وHTTPS Certificates"
  echo "   ٣) فعّل Funnel للجهاز (Access Controls: nodeAttrs → funnel) ثم:"
  echo "      sudo tailscale funnel --bg 3000"
  echo "   ٤) الرابط العام: https://<اسم-الجهاز>.<شبكتك>.ts.net  (يظهر بالأمر: tailscale funnel status)"
fi
if [ -n "$ADMIN_PW" ]; then
  echo " المدير: admin    كلمة المرور المؤقتة (مرة واحدة): $ADMIN_PW"
  echo " عند أول دخول: غيّر كلمة المرور ثم فعّل المصادقة الثنائية (تطبيق Authenticator على جوالك)."
  echo " (محفوظة أيضًا في $FIRST_ADMIN_FILE — احذفها بعد أول دخول: sudo shred -u $FIRST_ADMIN_FILE)"
else
  echo " (يوجد مدير مسبقًا — لم تُمسّ كلمة مروره. نسيتها؟ sudo talabak-admin create-admin --username=admin يعيد تعيينها)"
fi
TOPIC="$(grep ^NTFY_TOPIC= $ENV_FILE | cut -d= -f2)"
echo
echo " 🔔 تنبيهات الجوال (اختياري لكنه مفيد): ثبّت تطبيق ntfy على جوالك واشترك في الموضوع السري:"
echo "    https://ntfy.sh/$TOPIC      (اسم الموضوع: $TOPIC — يعمل كأنه كلمة مرور فلا تشاركه)"
echo "    تصلك رسالة بكل طلب جديد (بلا بيانات شخصية)، وعند إعادة تشغيل الخادم أو تعطّله."
[ -z "$HEARTBEAT" ] && echo "    وللتنبيه عند انقطاع الكهرباء/الجهاز: أنشئ فحصًا مجانيًا في healthchecks.io ثم أعد التشغيل مع --heartbeat-url=<رابط النبض>"
if [ "$NEW_SECRETS" = "1" ]; then
  echo
  echo " ⚠⚠ احفظ هذين السرّين الآن خارج الخادم (مدير كلمات مرور) — لا يمكن استرجاعهما إن ضاع الخادم:"
  echo "    $(grep ^APP_SECRET= $ENV_FILE)"
  echo "    $(grep ^BACKUP_PASSPHRASE= $ENV_FILE)"
  echo "    • BACKUP_PASSPHRASE: بدونها لا تُفتح النسخ الاحتياطية المشفّرة."
  echo "    • APP_SECRET: بدونه يُطلب من الجميع إعادة تفعيل المصادقة الثنائية بعد أي استعادة."
fi
echo "════════════════════════════════════════════════════════════"
[ "$MODE" = caddy ] && echo " مهم: افتح المنفذين 80 و443 في لوحة مزوّد السحابة (Security List / Firewall)، وقيّد المنفذ 22 بعنوانك فقط."
echo " فحص: curl -s http://127.0.0.1:3000/healthz     أوامر الإدارة: sudo talabak-admin <create-admin|reset-2fa|verify-audit|backup|restore>"
