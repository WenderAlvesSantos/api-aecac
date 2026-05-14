import nodemailer from 'nodemailer'

// Configuração do transporter de email
// Suporta múltiplos provedores: Gmail, SendGrid, SMTP customizado, etc.
const createTransporter = () => {
  // Se usar SendGrid
  if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: 'apikey', // SendGrid sempre usa 'apikey' como usuário
        pass: process.env.SENDGRID_API_KEY,
      },
    })
  }

  // Se usar Resend
  if (process.env.EMAIL_SERVICE === 'resend' && process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    })
  }

  // SMTP customizado (Gmail, Outlook, etc.)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  // Gmail OAuth2 (se configurado)
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    })
  }

  // Fallback: usar Gmail com senha de app (menos seguro)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  }

  // Modo desenvolvimento: não enviar emails reais
  console.warn('⚠️  Email não configurado. Emails não serão enviados.')
  return {
    sendMail: async (options) => {
      console.log('📧 [DEV MODE] Email que seria enviado:', {
        to: options.to,
        subject: options.subject,
        text: options.text?.substring(0, 100) + '...',
      })
      return { messageId: 'dev-mode' }
    },
  }
}

const transporter = createTransporter()

// E-mail ao fundador: cadastro aprovado (registro técnico ainda é "empresa" no banco)
export async function enviarEmailAprovacao(empresa) {
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@aecac.com.br'
    
    const mailOptions = {
      from: `AECAC <${emailFrom}>`,
      to: empresa.email,
      subject: '🎉 Seu cadastro de fundador foi aprovado na AECAC!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Parabéns!</h1>
              <p>Seu cadastro como fundador foi aprovado na AECAC</p>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>É com grande satisfação que informamos que o cadastro da empresa <strong>${empresa.nome}</strong> foi <strong>aprovado</strong> como <strong>fundador</strong> na Associação Empresarial e Comercial de Águas Claras (AECAC)!</p>
              
              <p>Agora você pode:</p>
              <ul>
                <li>✅ Acessar benefícios exclusivos para associados</li>
                <li>✅ Participar de capacitações e eventos</li>
                <li>✅ Fazer parte da rede de fundadores e empresas de Águas Claras</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/associado/login" class="button">
                  Criar Minha Conta de Associado
                </a>
              </p>
              
              <p><strong>Como criar sua conta:</strong></p>
              <ol>
                <li>Acesse a área do associado</li>
                <li>Clique em "Não tem conta? Cadastre-se"</li>
                <li>Use o mesmo email cadastrado: <strong>${empresa.email}</strong></li>
                <li>Crie sua senha e comece a aproveitar!</li>
              </ol>
              
              <p>Bem-vindo à AECAC!</p>
              <p>Equipe AECAC</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>AECAC - Associação Empresarial e Comercial de Águas Claras</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Parabéns! Seu cadastro de fundador foi aprovado na AECAC

Olá,

É com grande satisfação que informamos que o cadastro da empresa ${empresa.nome} foi aprovado como fundador na Associação Empresarial e Comercial de Águas Claras (AECAC)!

Agora você pode:
- Acessar benefícios exclusivos para associados
- Participar de capacitações e eventos
- Fazer parte da rede de fundadores e empresas de Águas Claras

Como criar sua conta:
1. Acesse: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/associado/login
2. Clique em "Não tem conta? Cadastre-se"
3. Use o mesmo email cadastrado: ${empresa.email}
4. Crie sua senha e comece a aproveitar!

Bem-vindo à AECAC!
Equipe AECAC
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email de aprovação enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Erro ao enviar email de aprovação:', error)
    return { success: false, error: error.message }
  }
}

// Função para enviar email de boas-vindas ao associado
export async function enviarEmailBoasVindas(usuario, empresa) {
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@aecac.com.br'
    
    const mailOptions = {
      from: `AECAC <${emailFrom}>`,
      to: usuario.email,
      subject: 'Bem-vindo à AECAC! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo, ${usuario.name}!</h1>
              <p>Sua conta foi criada com sucesso</p>
            </div>
            <div class="content">
              <p>Olá ${usuario.name},</p>
              <p>Sua conta de associado foi criada com sucesso!</p>
              
              <p>Você agora tem acesso a:</p>
              <ul>
                <li>🎁 <strong>Benefícios exclusivos</strong> - Descontos e condições especiais</li>
                <li>📚 <strong>Capacitações</strong> - Cursos e treinamentos para seu negócio</li>
                <li>📅 <strong>Eventos</strong> - Networking e eventos exclusivos</li>
                <li>🏢 <strong>Rede de fundadores</strong> - Conecte-se com outros associados</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/associado" class="button">
                  Acessar Minha Área
                </a>
              </p>
              
              <p><strong>Dados do seu cadastro (empresa fundadora):</strong></p>
              <ul>
                <li>Nome: ${empresa?.nome || 'N/A'}</li>
                <li>Categoria: ${empresa?.categoria || 'N/A'}</li>
              </ul>
              
              <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
              
              <p>Bem-vindo à AECAC!</p>
              <p>Equipe AECAC</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>AECAC - Associação Empresarial e Comercial de Águas Claras</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Bem-vindo à AECAC!

Olá ${usuario.name},

Sua conta de associado foi criada com sucesso!

Você agora tem acesso a:
- Benefícios exclusivos - Descontos e condições especiais
- Capacitações - Cursos e treinamentos para seu negócio
- Eventos - Networking e eventos exclusivos
- Rede de fundadores - Conecte-se com outros associados

Acesse sua área: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/associado

Dados do seu cadastro (empresa fundadora):
- Nome: ${empresa?.nome || 'N/A'}
- Categoria: ${empresa?.categoria || 'N/A'}

Bem-vindo à AECAC!
Equipe AECAC
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email de boas-vindas enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Erro ao enviar email de boas-vindas:', error)
    return { success: false, error: error.message }
  }
}

export async function enviarEmailRejeicao(empresa) {
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@aecac.com.br'
    
    const mailOptions = {
      from: `AECAC <${emailFrom}>`,
      to: empresa.email,
      subject: 'Sobre seu cadastro na AECAC',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f5222d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Informação sobre seu cadastro</h1>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>Informamos que o cadastro de fundador vinculado à empresa <strong>${empresa.nome}</strong> não foi aprovado no momento.</p>
              
              <p>Se você tiver dúvidas ou quiser mais informações, entre em contato conosco através dos nossos canais de atendimento.</p>
              
              <p>Atenciosamente,<br>Equipe AECAC</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>AECAC - Associação Empresarial e Comercial de Águas Claras</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Informação sobre seu cadastro

Olá,

Informamos que o cadastro de fundador vinculado à empresa ${empresa.nome} não foi aprovado no momento.

Se você tiver dúvidas ou quiser mais informações, entre em contato conosco através dos nossos canais de atendimento.

Atenciosamente,
Equipe AECAC
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email de rejeição enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Erro ao enviar email de rejeição:', error)
    return { success: false, error: error.message }
  }
}

// Função para notificar admin sobre novo cadastro pendente/pre-cadastro
export async function enviarEmailNovoCadastroPendente(empresa) {
  try {
    const emailAdmin = process.env.NOTIFY_ADMIN_EMAIL || process.env.ADMIN_EMAIL
    if (!emailAdmin) {
      console.warn('⚠️ NOTIFY_ADMIN_EMAIL/ADMIN_EMAIL não configurado. Notificação de novo cadastro não enviada.')
      return { success: false, skipped: true, reason: 'admin-email-not-configured' }
    }

    const emailFrom = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@aecac.com.br'
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const statusLabel = empresa.status === 'pre-cadastro' ? 'Pré-cadastro (Fundador)' : 'Pendente'

    const mailOptions = {
      from: `AECAC <${emailFrom}>`,
      to: emailAdmin,
      subject: `Novo fundador aguardando aprovação: ${empresa.nome}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1890ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; }
            .badge { display: inline-block; background: #e6f4ff; color: #0958d9; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
            .button { display: inline-block; background: #1677ff; color: white; padding: 10px 18px; text-decoration: none; border-radius: 4px; margin-top: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Novo cadastro de fundador</h2>
              <p>Um fundador entrou na fila de aprovação</p>
            </div>
            <div class="content">
              <p><span class="badge">${statusLabel}</span></p>
              <p><strong>Empresa (fundador):</strong> ${empresa.nome || '-'}</p>
              <p><strong>CNPJ:</strong> ${empresa.cnpj || '-'}</p>
              <p><strong>Responsável:</strong> ${empresa.responsavel || '-'}</p>
              <p><strong>Email:</strong> ${empresa.email || '-'}</p>
              <p><strong>Telefone:</strong> ${empresa.telefone || '-'}</p>
              <p><strong>Categoria:</strong> ${empresa.categoria || '-'}</p>
              <p>
                <a href="${frontendUrl}/admin/fundadores" class="button">Abrir painel de fundadores</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Novo cadastro de fundador na fila de aprovação

Status: ${statusLabel}
Empresa (fundador): ${empresa.nome || '-'}
CNPJ: ${empresa.cnpj || '-'}
Responsável: ${empresa.responsavel || '-'}
Email: ${empresa.email || '-'}
Telefone: ${empresa.telefone || '-'}
Categoria: ${empresa.categoria || '-'}

Abrir painel: ${frontendUrl}/admin/fundadores
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email de novo cadastro pendente enviado para admin:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Erro ao enviar email de novo cadastro pendente:', error)
    return { success: false, error: error.message }
  }
}

const attachmentPdf = (pdfBuffer, cnpjLimpo) => ({
  filename: `carta-adesao-aecac-${cnpjLimpo || 'fundador'}.pdf`,
  content: pdfBuffer,
  contentType: 'application/pdf',
})

/**
 * Envia o PDF da carta de adesão assinada para o admin (NOTIFY_ADMIN_EMAIL) e para o e-mail do fundador.
 */
export async function enviarCadastroFundadorComCartaPdf({ empresa, pdfBuffer }) {
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@aecac.com.br'
  const adminTo = process.env.NOTIFY_ADMIN_EMAIL || process.env.ADMIN_EMAIL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const att = attachmentPdf(pdfBuffer, empresa.cnpj)
  const nomeEmpresa = empresa.nome || '-'

  const htmlCorpo = (destinatarioLabel) => `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 640px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #1e4d7b, #5b9bd5); color: white; padding: 22px; border-radius: 8px 8px 0 0; }
      .content { background: #f9f9f9; padding: 22px; border-radius: 0 0 8px 8px; }
      .footer { text-align: center; margin-top: 18px; color: #666; font-size: 12px; }
    </style>
    </head><body>
    <div class="container">
      <div class="header">
        <h2 style="margin:0;">Carta de Adesão — cadastro de fundador</h2>
        <p style="margin:8px 0 0;">${destinatarioLabel}</p>
      </div>
      <div class="content">
        <p>Segue em anexo o PDF da <strong>Carta de Adesão</strong> assinada eletronicamente.</p>
        <p><strong>Empresa (fundador):</strong> ${nomeEmpresa}<br/>
        <strong>CNPJ:</strong> ${empresa.cnpj || '-'}<br/>
        <strong>Responsável:</strong> ${empresa.responsavel || '-'}<br/>
        <strong>E-mail:</strong> ${empresa.email || '-'}</p>
        ${
          adminTo
            ? `<p><a href="${frontendUrl}/admin/fundadores">Abrir painel de fundadores</a></p>`
            : ''
        }
      </div>
      <div class="footer">AECAC — Associação Empresarial e Comercial de Águas Claras</div>
    </div>
    </body></html>
  `

  const results = []

  if (adminTo) {
    const info = await transporter.sendMail({
      from: `AECAC <${emailFrom}>`,
      to: adminTo,
      subject: `[AECAC] Carta de adesão assinada — ${nomeEmpresa}`,
      html: htmlCorpo('Notificação para a equipe administrativa'),
      text: `Carta de adesão assinada (PDF em anexo).\nEmpresa: ${nomeEmpresa}\nCNPJ: ${empresa.cnpj}\nPainel: ${frontendUrl}/admin/fundadores`,
      attachments: [att],
    })
    results.push({ to: 'admin', messageId: info.messageId })
  } else {
    console.warn('⚠️ NOTIFY_ADMIN_EMAIL/ADMIN_EMAIL não configurado. PDF não enviado ao admin.')
    results.push({ to: 'admin', skipped: true })
  }

  const emailEmpresa = (empresa.email || '').trim()
  if (emailEmpresa) {
    const infoEmp = await transporter.sendMail({
      from: `AECAC <${emailFrom}>`,
      to: emailEmpresa,
      subject: 'AECAC — cópia da sua Carta de Adesão (PDF)',
      html: htmlCorpo('Cópia para o e-mail informado no cadastro'),
      text: `Olá,\n\nEm anexo está a cópia da Carta de Adesão assinada referente ao cadastro da empresa ${nomeEmpresa}.\n\nAECAC`,
      attachments: [att],
    })
    results.push({ to: 'empresa', messageId: infoEmpresa.messageId })
  } else {
    results.push({ to: 'empresa', skipped: true, reason: 'no-email' })
  }

  return { success: true, results }
  } catch (error) {
    console.error('❌ Erro ao enviar e-mails com PDF da carta:', error)
    return { success: false, error: error.message }
  }
}

