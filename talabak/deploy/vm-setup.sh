#!/usr/bin/env bash
# تثبيت «طلبك معنا» على خادم Ubuntu مجاني (Oracle Cloud Always Free أو Google Cloud e2-micro) مع HTTPS تلقائي.
# الاستخدام (من داخل المجلد talabak بعد استنساخ المستودع):
#   sudo bash deploy/vm-setup.sh                 → رابط تلقائي مجاني بصيغة  https://1-2-3-4.sslip.io
#   sudo bash deploy/vm-setup.sh talabak.example.com   → إن كان لديك نطاق يشير إلى عنوان الخادم
# آمن للتكرار: لا يعيد تعيين كلمة مرور مدير موجود، ولا يمس قاعدة البيانات.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

[ "$(id -u)" = 0 ] || { echo "شغّل السكربت بـ sudo"; exit 1; }
APP_SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR=/opt/talabak
DATA_DIR=/var/lib/talabak
DOMAIN="${1:-}"

echo "▶ ١/٦ تحديث الحزم"
apt-get update -y
apt-get install -y curl ca-certificates gnupg apt-transport-https debian-keyring debian-archive-keyring

echo "▶ ٢/٦ Node.js 22"
if ! command -v node >/dev/null || ! node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "▶ ٣/٦ نسخ التطبيق"
id talabak >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin talabak
mkdir -p "$APP_DIR" "$DATA_DIR"
if [ "$APP_SRC" != "$APP_DIR" ]; then
  tar --exclude=./data --exclude=./node_modules --exclude=./.git -C "$APP_SRC" -cf - . | tar -C "$APP_DIR" -xf -
fi
chown -R talabak:talabak "$APP_DIR" "$DATA_DIR"
chmod 700 "$DATA_DIR"

echo "▶ ٤/٦ خدمة systemd (تعمل تلقائيًا وتعيد التشغيل عند الأعطال)"
cat > /etc/systemd/system/talabak.service <<UNIT
[Unit]
Description=Talabak Maana (KPTC)
After=network-online.target
Wants=network-online.target

[Service]
User=talabak
WorkingDirectory=$APP_DIR
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=DATA_DIR=$DATA_DIR
Environment=TRUST_PROXY=1
Environment=COOKIE_SECURE=1
Environment=BACKUP_EVERY_HOURS=6
ExecStart=/usr/bin/node --no-warnings server/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$DATA_DIR
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload

# المدير الأول: فقط إن لم يوجد مدير (لا نعيد تعيين كلمة مرور موجودة)
HAS_ADMIN=$(sudo -u talabak env DATA_DIR="$DATA_DIR" node --no-warnings -e "
try { const {DatabaseSync}=require('node:sqlite'); const d=new DatabaseSync(process.env.DATA_DIR+'/talabak.db',{readOnly:true});
console.log(d.prepare(\"select count(*) n from users where role='admin'\").get().n) } catch { console.log(0) }")
ADMIN_PW=""
if [ "$HAS_ADMIN" = "0" ]; then
  OUT=$(cd "$APP_DIR" && sudo -u talabak env DATA_DIR="$DATA_DIR" node --no-warnings scripts/create-admin.js --username=admin --name="مدير النظام")
  ADMIN_PW=$(echo "$OUT" | grep -E '^\s+\S{10,}$' | tr -d ' ')
fi
systemctl enable --now talabak
systemctl restart talabak

echo "▶ ٥/٦ Caddy (HTTPS تلقائي من Let's Encrypt)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
if [ -z "$DOMAIN" ]; then
  IP=$(curl -4 -fsS https://api.ipify.org)
  DOMAIN="${IP//./-}.sslip.io"   # نطاق مجاني يشير تلقائيًا إلى عنوان IP
fi
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl enable caddy
systemctl restart caddy

echo "▶ ٦/٦ فتح المنفذين 80 و443 في جدار الخادم"
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp; ufw allow 443/tcp
fi
if command -v iptables >/dev/null; then   # صور Oracle تحجب كل شيء ما عدا SSH افتراضيًا
  for p in 80 443; do iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport $p -j ACCEPT; done
  apt-get install -y iptables-persistent netfilter-persistent >/dev/null 2>&1 || true
  netfilter-persistent save >/dev/null 2>&1 || true
fi

sleep 3
echo
echo "════════════════════════════════════════════════════"
echo " تم. رابط التطبيق:  https://$DOMAIN"
echo " لوحة الموظفين:     https://$DOMAIN/staff"
if [ -n "$ADMIN_PW" ]; then
  echo " المدير: admin    كلمة المرور المؤقتة (تُعرض مرة واحدة): $ADMIN_PW"
else
  echo " (يوجد مدير مسبقًا — لم تُمسّ كلمة مروره)"
fi
echo "════════════════════════════════════════════════════"
echo " مهم: افتح المنفذين 80 و443 أيضًا في لوحة مزوّد السحابة (Security List / Firewall) وإلا لن يعمل الرابط من الخارج."
echo " فحص: curl -s https://$DOMAIN/healthz"
