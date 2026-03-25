// ============================================
// Abstração para notificações via WhatsApp
// Pronta para integrar com API externa (Twilio, Z-API, etc.)
// ============================================

interface WhatsAppPayload {
  phone: string
  message: string
  timestamp: string
}

// Envia lembrete por WhatsApp (simulado por enquanto)
export async function sendWhatsAppReminder(
  phone: string,
  message: string
): Promise<WhatsAppPayload> {
  const payload: WhatsAppPayload = {
    phone: formatPhone(phone),
    message,
    timestamp: new Date().toISOString(),
  }

  // TODO: Substituir pelo envio real via API
  // Exemplo com Twilio:
  // await twilio.messages.create({
  //   from: 'whatsapp:+14155238886',
  //   to: `whatsapp:${payload.phone}`,
  //   body: payload.message,
  // })

  console.log('[WhatsApp] Lembrete simulado:', payload)
  return payload
}

// Formata telefone para padrão internacional (+55...)
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55')) return `+${digits}`
  return `+55${digits}`
}

// Mensagens pré-formatadas para lembretes
export function buildScheduleReminder(customerName: string, date: string): string {
  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')
  return `Olá ${customerName}! 🏊 Sua manutenção de piscina está agendada para ${formatted}. Equipe TiBum.`
}

export function buildPaymentReminder(customerName: string, amount: number): string {
  return `Olá ${customerName}! 💰 Você tem um pagamento pendente de R$ ${amount.toFixed(2)}. Entre em contato para acertar. Equipe TiBum.`
}
