import { describe, it, expect, beforeAll } from 'vitest'

// Set env vars before importing the module
beforeAll(() => {
  process.env.SERVER_HOST = 'test.example.com'
  process.env.SERVER_PORT = '443'
  process.env.REALITY_PUBLIC_KEY = 'testpublickey123'
  process.env.REALITY_SHORT_ID = 'abc123'
  process.env.REALITY_SNI = 'www.microsoft.com'
})

describe('Config generation', () => {
  it('generateVlessLink returns correct format', async () => {
    const { generateVlessLink } = await import('../xray/config')
    const uuid = '12345678-1234-1234-1234-123456789012'
    const link = generateVlessLink(uuid, 'Test VPN')

    expect(link).toMatch(/^vless:\/\//)
    expect(link).toContain(uuid)
    expect(link).toContain('test.example.com:443')
    expect(link).toContain('security=reality')
    expect(link).toContain('flow=xtls-rprx-vision')
  })

  it('generateClashConfig returns valid YAML structure', async () => {
    const { generateClashConfig } = await import('../xray/config')
    const uuid = '12345678-1234-1234-1234-123456789012'
    const yaml = generateClashConfig(uuid, 'user_1_test')

    expect(yaml).toContain('proxies:')
    expect(yaml).toContain('type: vless')
    expect(yaml).toContain(`server: test.example.com`)
    expect(yaml).toContain(`uuid: ${uuid}`)
    expect(yaml).toContain('reality-opts:')
    expect(yaml).toContain('public-key: testpublickey123')
    expect(yaml).toContain('rules:')
    expect(yaml).toContain('GEOIP,RU,DIRECT')
  })

  it('generateSingboxConfig returns valid JSON', async () => {
    const { generateSingboxConfig } = await import('../xray/config')
    const uuid = '12345678-1234-1234-1234-123456789012'
    const jsonStr = generateSingboxConfig(uuid)

    expect(() => JSON.parse(jsonStr)).not.toThrow()
    const cfg = JSON.parse(jsonStr)

    expect(cfg.outbounds).toBeDefined()
    const proxy = cfg.outbounds.find((o: any) => o.type === 'vless')
    expect(proxy).toBeDefined()
    expect(proxy.uuid).toBe(uuid)
    expect(proxy.tls.reality.enabled).toBe(true)
    expect(proxy.tls.reality.public_key).toBe('testpublickey123')
  })
})
