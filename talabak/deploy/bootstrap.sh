#!/usr/bin/env bash
# أمر واحد يجهّز الخادم كاملًا (بلا نسخ ولصق متعدد الأسطر):
#   curl -fsSL https://raw.githubusercontent.com/Afq-88/HOMISSION/claude/kptc-request-app-3t4trj/talabak/deploy/bootstrap.sh | sudo bash -s -- --mode=tailscale --laptop
# الخيارات تمرَّر إلى vm-setup.sh. خيار إضافي هنا: --with-claude لتثبيت Claude Code على الجهاز بعد انتهاء التثبيت.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "شغّل بـ sudo"; exit 1; }
BRANCH="${TALABAK_BRANCH:-claude/kptc-request-app-3t4trj}"
SRC=/opt/talabak-src
echo 'DPkg::Lock::Timeout "900";' > /etc/apt/apt.conf.d/99-talabak-lock-timeout
DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates

# تنبيه فقط إن كان DNS معدَّلًا يدويًا (يتعارض مع Tailscale)
if [ -f /etc/resolv.conf ] && [ ! -L /etc/resolv.conf ] && systemctl is-active --quiet systemd-resolved 2>/dev/null; then
  echo "تنبيه: /etc/resolv.conf ملف يدوي. أصلحه بـ: sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf"
fi

WITH_CLAUDE=0; ARGS=()
for a in "$@"; do [ "$a" = "--with-claude" ] && WITH_CLAUDE=1 || ARGS+=("$a"); done
[ ${#ARGS[@]} -gt 0 ] || ARGS=(--mode=tailscale --laptop)

if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch --depth 1 origin "$BRANCH" && git -C "$SRC" reset --hard FETCH_HEAD
else
  rm -rf "$SRC"; git clone --depth 1 -b "$BRANCH" https://github.com/Afq-88/HOMISSION.git "$SRC"
fi
bash "$SRC/talabak/deploy/vm-setup.sh" "${ARGS[@]}"

if [ "$WITH_CLAUDE" = 1 ]; then
  echo "▶ تثبيت Claude Code"
  command -v npm >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y npm
  npm install -g @anthropic-ai/claude-code && echo "تم. للتشغيل: cd $SRC && claude   (تسجيل الدخول بحسابك أول مرة)"
fi
