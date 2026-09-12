import { Bot } from 'grammy'
import { InputFile } from 'grammy'
import { generateClashConfig, generateSingboxConfig, generateVlessLink } from '../xray/config'
import type { SubscriptionRow } from '../db/database'

export async function sendConfig(bot: Bot, tgId: number, sub: SubscriptionRow) {
  if (!sub.xray_uuid || !sub.xray_email) return

  const clashYaml = generateClashConfig(sub.xray_uuid, sub.xray_email)
  const singboxJson = generateSingboxConfig(sub.xray_uuid)
  const vlessLink = generateVlessLink(sub.xray_uuid, 'VPN')

  await bot.api.sendMessage(
    tgId,
    `🔑 <b>Твой VPN-конфиг</b>\n\n` +
    `<b>VLESS ссылка</b> (для большинства клиентов):\n` +
    `<code>${vlessLink}</code>\n\n` +
    `Ниже файлы для Clash Meta и sing-box 👇`,
    { parse_mode: 'HTML' }
  )

  await bot.api.sendDocument(tgId, new InputFile(Buffer.from(clashYaml), 'vpn-clash.yaml'), {
    caption: '📄 Clash Meta / Mihomo config',
  })

  await bot.api.sendDocument(tgId, new InputFile(Buffer.from(singboxJson), 'vpn-singbox.json'), {
    caption: '📄 sing-box config',
  })

  await bot.api.sendMessage(
    tgId,
    `📱 <b>Как подключиться:</b>\n\n` +
    `<b>Android/iOS:</b> скачай <b>v2rayNG</b> или <b>Streisand</b>, импортируй VLESS ссылку\n` +
    `<b>Windows/Mac:</b> скачай <b>Hiddify</b> или <b>Clash Meta</b>, импортируй .yaml файл\n\n` +
    `❓ Проблемы? Пиши /support`,
    { parse_mode: 'HTML' }
  )
}
