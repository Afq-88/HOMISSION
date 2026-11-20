#!/usr/bin/env bash
# تشخيص جاهزية الجهاز كخادم. شغّله ثم ألصق المخرجات في المحادثة:   bash deploy/server-check.sh
# لا يعدّل شيئًا ولا يطبع كلمات مرور (يُخفي كلمة مرور الواي فاي إن ظهرت).
echo "=== النظام ==="; . /etc/os-release; echo "$PRETTY_NAME  | kernel $(uname -r)"
echo "الجهاز: $(cat /sys/class/dmi/id/product_name 2>/dev/null)  |  $(lscpu | awk -F: '/Model name/{gsub(/^ +/,"",$2);print $2}')"
echo "SSE4.2: $(grep -c sse4_2 /proc/cpuinfo >/dev/null && grep -q sse4_2 /proc/cpuinfo && echo نعم || echo لا)  |  أنوية: $(nproc)  |  RAM: $(free -h | awk '/Mem:/{print $2}')"
echo "القرص:"; df -h / | tail -1
echo; echo "=== الشبكة ==="
ip -4 -br addr show scope global
echo "المسار الافتراضي: $(ip route | awk '/default/{print $3" عبر "$5}' | head -1)"
echo "DNS: $(readlink -f /etc/resolv.conf)  →  $(grep -E '^nameserver' /etc/resolv.conf | tr '\n' ' ')"
for h in 1.1.1.1 github.com nodejs.org; do printf "ping %s: " $h; ping -c1 -W3 $h >/dev/null 2>&1 && echo OK || echo فشل; done
echo "عنوان الإنترنت العام: $(curl -4 -s --max-time 8 https://api.ipify.org || echo غير متاح)"
echo "الواي فاي: $(nmcli -t -f ACTIVE,SSID,SIGNAL dev wifi 2>/dev/null | grep '^yes' | head -1)"
echo; echo "=== البرمجيات ==="
for c in git curl node npm tailscale caddy ssh; do printf "%-10s" $c; command -v $c >/dev/null && ($c --version 2>&1 | head -1) || echo "غير مثبت"; done
node -e "1" 2>&1 | head -1
systemctl is-active ssh 2>/dev/null | sed 's/^/ssh: /'
echo; echo "=== الطاقة والحرارة ==="
(upower -i "$(upower -e 2>/dev/null | grep -i BAT | head -1)" 2>/dev/null | grep -E 'state|percentage|capacity|energy-full' ) || echo "upower غير مثبت"
(sensors 2>/dev/null | grep -E 'Core|temp1|fan' | head -6) || echo "sensors غير مثبت"
echo; echo "=== تطبيق «طلبك معنا» ==="
systemctl is-active talabak 2>/dev/null | sed 's/^/talabak: /'; curl -s --max-time 4 http://127.0.0.1:3000/healthz || echo "التطبيق لا يستجيب بعد"
