interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  wabaId: string
}

interface WhatsAppMessage {
  to: string
  type: 'text' | 'template'
  text?: {
    body: string
  }
  template?: {
    name: string
    language: {
      code: string
    }
    components?: Array<{
      type: 'text'
      text: string
    }>
  }
}

class WhatsAppClient {
  private config: WhatsAppConfig | null = null
  private devConfig: WhatsAppConfig | null = null

  constructor() {
    // Dev config for testing
    if (process.env.WHATSAPP_DEV_ACCESS_TOKEN && process.env.WHATSAPP_DEV_PHONE_NUMBER_ID && process.env.WHATSAPP_DEV_WABA_ID) {
      this.devConfig = {
        phoneNumberId: process.env.WHATSAPP_DEV_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_DEV_ACCESS_TOKEN,
        wabaId: process.env.WHATSAPP_DEV_WABA_ID
      }
    }
  }

  private isDemoMode(): boolean {
    return process.env.NODE_ENV === 'development' || 
           !process.env.DATABASE_URL || 
           process.env.DATABASE_URL.includes('demo') ||
           process.env.META_APP_ID === 'demo_app_id'
  }

  setOrgConfig(config: WhatsAppConfig) {
    this.config = config
  }

  private getConfig(): WhatsAppConfig {
    return this.config || this.devConfig || (() => {
      throw new Error('WhatsApp not configured for this organisation')
    })()
  }

  async sendMessage(message: WhatsAppMessage): Promise<any> {
    // In demo mode, just log the message instead of sending
    if (this.isDemoMode()) {
      console.log('📱 DEMO WHATSAPP MESSAGE:', {
        to: message.to,
        type: message.type,
        content: message[message.type]
      })
      return { 
        messaging_product: 'whatsapp',
        contacts: [{ input: message.to, wa_id: message.to }],
        messages: [{ id: 'demo-message-' + Date.now() }]
      }
    }

    const config = this.getConfig()
    const url = `${process.env.META_GRAPH_BASE}/${config.phoneNumberId}/messages`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: message.to,
        type: message.type,
        [message.type]: message[message.type]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`WhatsApp API error: ${response.status} ${error}`)
    }

    return response.json()
  }

  async sendTextMessage(to: string, text: string): Promise<any> {
    return this.sendMessage({
      to,
      type: 'text',
      text: { body: text }
    })
  }

  async sendTemplateMessage(to: string, templateName: string, parameters: string[]): Promise<any> {
    return this.sendMessage({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: parameters.map(param => ({
          type: 'text',
          text: param
        }))
      }
    })
  }

  // Template methods
  async sendParentInvite(to: string, parentName: string, orgName: string, inviteUrl: string): Promise<any> {
    return this.sendTemplateMessage(to, 'parent_invite', [parentName, orgName, inviteUrl])
  }

  async sendAnnouncement(to: string, title: string, message: string): Promise<any> {
    return this.sendTemplateMessage(to, 'announcement_simple', [title, message])
  }

  async sendPaymentLink(to: string, invoiceId: string, amount: string, paymentUrl: string): Promise<any> {
    return this.sendTemplateMessage(to, 'payment_link', [invoiceId.slice(-8), amount, paymentUrl])
  }

  async sendPaymentFailedPlatform(to: string, orgName: string, updateUrl: string): Promise<any> {
    return this.sendTemplateMessage(to, 'payment_failed_platform', [orgName, updateUrl])
  }
}

export const whatsapp = new WhatsAppClient()

export async function verifyWebhook(token: string): Promise<boolean> {
  return token === process.env.WHATSAPP_VERIFY_TOKEN
}

export async function handleWebhook(body: any): Promise<void> {
  // Handle different webhook events
  if (body.entry) {
    for (const entry of body.entry) {
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.value?.messages) {
            // Handle incoming messages
            for (const message of change.value.messages) {
              // You could implement auto-replies or message processing here
            }
          }
          
          if (change.value?.statuses) {
            // Handle message status updates
            for (const status of change.value.statuses) {
              // You could update message status in your database here
            }
          }
        }
      }
    }
  }
}
