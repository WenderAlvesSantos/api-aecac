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

// Função para enviar email de aprovação de empresa
export async function enviarEmailAprovacao(empresa) {
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@aecac.com.br'
    
    const mailOptions = {
      from: `AECAC <${emailFrom}>`,
      to: empresa.email,
      subject: '🎉 Sua empresa foi aprovada na AECAC!',
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
              <p>Sua empresa foi aprovada na AECAC</p>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>É com grande satisfação que informamos que sua empresa <strong>${empresa.nome}</strong> foi <strong>aprovada</strong> para fazer parte da Associação Empresarial e Comercial de Águas Claras (AECAC)!</p>
              
              <p>Agora você pode:</p>
              <ul>
                <li>✅ Acessar benefícios exclusivos para associados</li>
                <li>✅ Participar de capacitações e eventos</li>
                <li>✅ Fazer parte da rede de empresas de Águas Claras</li>
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
Parabéns! Sua empresa foi aprovada na AECAC

Olá,

É com grande satisfação que informamos que sua empresa ${empresa.nome} foi aprovada para fazer parte da Associação Empresarial e Comercial de Águas Claras (AECAC)!

Agora você pode:
- Acessar benefícios exclusivos para associados
- Participar de capacitações e eventos
- Fazer parte da rede de empresas de Águas Claras

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
                <li>🏢 <strong>Rede de empresas</strong> - Conecte-se com outros associados</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/associado" class="button">
                  Acessar Minha Área
                </a>
              </p>
              
              <p><strong>Dados da sua empresa:</strong></p>
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
- Rede de empresas - Conecte-se com outros associados

Acesse sua área: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/associado

Dados da sua empresa:
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

// Função para enviar email de rejeição de empresa
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
              <p>Informamos que o cadastro da empresa <strong>${empresa.nome}</strong> não foi aprovado no momento.</p>
              
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

Informamos que o cadastro da empresa ${empresa.nome} não foi aprovado no momento.

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

