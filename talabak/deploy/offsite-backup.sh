#!/usr/bin/env bash
# يرفع النسخ الاحتياطية *المشفّرة فقط* (.db.enc) إلى تخزين سحابي مجاني (Google Drive / OneDrive / Mega / Proton Drive …) عبر rclone.
# لأن الملفات مشفّرة بـ AES-256 بعبارتك، لا يستطيع مزوّد التخزين قراءة بيانات العملاء.
# الاستخدام:
#   sudo rclone config                       # مرة واحدة: أنشئ ريموت (مثلًا باسم gdrive) — راجع دليل HOME-SERVER-AR.md
#   sudo bash deploy/offsite-backup.sh gdrive
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "شغّل بـ sudo"; exit 1; }
REMOTE="${1:-}"; [ -n "$REMOTE" ] || { echo "الاستخدام: sudo bash deploy/offsite-backup.sh <اسم-الريموت>"; exit 1; }
[ -f /etc/talabak.env ] && . /etc/talabak.env
[ -n "${BACKUP_PASSPHRASE:-}" ] || { echo "لا توجد BACKUP_PASSPHRASE: لن أرفع نسخًا غير مشفّرة."; exit 1; }
command -v rclone >/dev/null || apt-get install -y rclone
rclone listremotes | grep -q "^$REMOTE:" || { echo "الريموت «$REMOTE» غير مُعدّ. نفّذ: sudo rclone config"; exit 1; }

cat > /etc/systemd/system/talabak-offsite.service <<UNIT
[Unit]
Description=Talabak offsite encrypted backup upload
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
ExecStart=/usr/bin/rclone copy /var/lib/talabak/backups $REMOTE:talabak-backups --include "*.db.enc" --min-age 1m --transfers 1 --log-level NOTICE
Nice=10
UNIT
cat > /etc/systemd/system/talabak-offsite.timer <<'UNIT'
[Unit]
Description=Upload Talabak encrypted backups every 6 hours
[Timer]
OnCalendar=*-*-* 00,06,12,18:20:00
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now talabak-offsite.timer
systemctl start talabak-offsite.service && echo "تم الرفع التجريبي ✔" || echo "فشل الرفع: راجع journalctl -u talabak-offsite"
echo "الجدولة: كل ٦ ساعات.  فحص:  systemctl list-timers | grep talabak   —   rclone ls $REMOTE:talabak-backups"
