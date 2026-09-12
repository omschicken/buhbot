# Настройка VPN-сервера

## 1. VPS

Рекомендуемые хостинги (не блокируются РКН):
- **Hetzner** (Германия/Финляндия) — от €4/мес
- **Contabo** (Германия) — от €5/мес
- **DigitalOcean** / **Vultr** — от $6/мес

ОС: Ubuntu 22.04

---

## 2. Установка 3x-ui панели

```bash
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
```

Запомни данные: порт панели, логин/пароль.

---

## 3. Создание VLESS + XTLS-Reality inbound

В панели 3x-ui:
1. Inbounds → Add Inbound
2. Protocol: **vless**
3. Port: **443**
4. Security: **Reality**
5. uTLS: **chrome**
6. Dest (SNI): `www.microsoft.com:443`
7. Нажми "Get New Cert" — сохрани **Public Key** и **Short ID**

---

## 4. .env для бота

```
XRAY_PANEL_URL=https://your-vps-ip:54321
XRAY_PANEL_USER=admin
XRAY_PANEL_PASS=your_password
XRAY_INBOUND_ID=1

SERVER_HOST=your-vps-ip
SERVER_PORT=443
REALITY_PUBLIC_KEY=<из панели>
REALITY_SHORT_ID=<из панели>
REALITY_SNI=www.microsoft.com
```

---

## 5. Запуск бота

```bash
cd vpn/bot
cp .env.example .env
# Заполни .env
npm install
npm run dev        # разработка
npm run build && npm start  # продакшен
```

---

## 6. Рекомендуемые клиенты для пользователей

| Платформа | Клиент |
|-----------|--------|
| Android | v2rayNG, Hiddify |
| iOS | Streisand, Shadowrocket |
| Windows | Hiddify, Clash Meta (Clash Verge) |
| macOS | Hiddify, Clash Meta |

---

## 7. Масштабирование (юрики, массовые подключения)

При подключении компаний генерируй отдельный UUID на каждого сотрудника через ту же API панели. Лимит IP (`limitIp`) ставь в соответствии с договором.
