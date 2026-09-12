// Generates Clash Meta / sing-box configs for the user

const SERVER = process.env.SERVER_HOST || 'your-server.com'
const SERVER_PORT = Number(process.env.SERVER_PORT || 443)
const PUBLIC_KEY = process.env.REALITY_PUBLIC_KEY || ''
const SHORT_ID = process.env.REALITY_SHORT_ID || ''
const SNI = process.env.REALITY_SNI || 'www.microsoft.com'

export function generateClashConfig(uuid: string, email: string): string {
  return `# VPN Config — ${email}
# Clash Meta / Mihomo
mixed-port: 7890
allow-lan: false
mode: rule
log-level: warning
dns:
  enable: true
  nameserver: [8.8.8.8, 1.1.1.1]

proxies:
  - name: VPN
    type: vless
    server: ${SERVER}
    port: ${SERVER_PORT}
    uuid: ${uuid}
    network: tcp
    tls: true
    udp: true
    flow: xtls-rprx-vision
    reality-opts:
      public-key: ${PUBLIC_KEY}
      short-id: ${SHORT_ID}
    servername: ${SNI}
    client-fingerprint: chrome

proxy-groups:
  - name: PROXY
    type: select
    proxies: [VPN, DIRECT]

rules:
  - GEOIP,RU,DIRECT
  - MATCH,PROXY
`
}

export function generateSingboxConfig(uuid: string): string {
  return JSON.stringify({
    log: { level: 'warn' },
    dns: {
      servers: [
        { tag: 'google', address: 'tls://8.8.8.8' },
        { tag: 'local', address: '223.5.5.5', detour: 'direct' },
      ],
    },
    inbounds: [
      { type: 'mixed', listen: '127.0.0.1', listen_port: 2080 },
    ],
    outbounds: [
      {
        tag: 'proxy',
        type: 'vless',
        server: SERVER,
        server_port: SERVER_PORT,
        uuid,
        flow: 'xtls-rprx-vision',
        tls: {
          enabled: true,
          server_name: SNI,
          utls: { enabled: true, fingerprint: 'chrome' },
          reality: {
            enabled: true,
            public_key: PUBLIC_KEY,
            short_id: SHORT_ID,
          },
        },
      },
      { tag: 'direct', type: 'direct' },
      { tag: 'block', type: 'block' },
    ],
    route: {
      rules: [
        { geoip: ['ru'], outbound: 'direct' },
      ],
      final: 'proxy',
    },
  }, null, 2)
}

export function generateVlessLink(uuid: string, remark: string): string {
  const params = new URLSearchParams({
    security: 'reality',
    encryption: 'none',
    pbk: PUBLIC_KEY,
    fp: 'chrome',
    sni: SNI,
    sid: SHORT_ID,
    type: 'tcp',
    flow: 'xtls-rprx-vision',
  })
  return `vless://${uuid}@${SERVER}:${SERVER_PORT}?${params.toString()}#${encodeURIComponent(remark)}`
}
