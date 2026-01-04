// Rota unificada para todas as APIs - resolve o limite de 12 funções serverless
import { corsHeaders, handleOptions } from '../../middleware/cors'

// Configurar bodyParser para aceitar até 10MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

// Importar handlers estáticos
import eventosIndex from '../../_handlers/eventos/index'
import eventosId from '../../_handlers/eventos/[id]'
import parceirosIndex from '../../_handlers/parceiros/index'
import parceirosId from '../../_handlers/parceiros/[id]'
import empresasIndex from '../../_handlers/empresas/index'
import empresasId from '../../_handlers/empresas/[id]'
import empresasAprovar from '../../_handlers/empresas/aprovar'
import empresasPendentes from '../../_handlers/empresas/pendentes'
import galeriaIndex from '../../_handlers/galeria/index'
import galeriaId from '../../_handlers/galeria/[id]'
import galeriaOrdem from '../../_handlers/galeria/ordem'
import diretoriaIndex from '../../_handlers/diretoria/index'
import diretoriaId from '../../_handlers/diretoria/[id]'
import sobreIndex from '../../_handlers/sobre/index'
import configuracoesIndex from '../../_handlers/configuracoes/index'
import usuariosIndex from '../../_handlers/usuarios/index'
import usuariosId from '../../_handlers/usuarios/[id]'
import authLogin from '../../_handlers/auth/login'
import authRegister from '../../_handlers/auth/register'
import authPerfil from '../../_handlers/auth/perfil'
import authLoginAssociado from '../../_handlers/auth/login-associado'
import authRegisterAssociado from '../../_handlers/auth/register-associado'
import beneficiosIndex from '../../_handlers/beneficios/index'
import beneficiosId from '../../_handlers/beneficios/[id]'
import beneficiosResgatar from '../../_handlers/beneficios/resgatar'
import beneficiosResgatarPublico from '../../_handlers/beneficios/resgatar-publico'
import beneficiosResgates from '../../_handlers/beneficios/resgates'
import capacitacoesIndex from '../../_handlers/capacitacoes/index'
import capacitacoesId from '../../_handlers/capacitacoes/[id]'
import capacitacoesInscrever from '../../_handlers/capacitacoes/inscrever'
import capacitacoesInscreverPublico from '../../_handlers/capacitacoes/inscrever-publico'
import capacitacoesInscritos from '../../_handlers/capacitacoes/inscritos'
import eventosInscreverPublico from '../../_handlers/eventos/inscrever-publico'
import eventosInscritos from '../../_handlers/eventos/inscritos'
import notificacoesIndex from '../../_handlers/notificacoes/index'
import notificacoesId from '../../_handlers/notificacoes/[id]'
import notificacoesMarcarTodas from '../../_handlers/notificacoes/marcar-todas'
import relatoriosIndex from '../../_handlers/relatorios/index'
import exportarIndex from '../../_handlers/exportar/index'
import buscarCNPJ from '../../_handlers/consultas/buscar-cnpj'
import buscarCEP from '../../_handlers/consultas/buscar-cep'

export default async function handler(req, res) {
  try {
    // Handle CORS preflight
    if (handleOptions(req, res)) {
      return
    }

    // Set CORS headers
    corsHeaders(res)
    
    // Extrair rota da query (Next.js passa como array no req.query.route)
    // Quando a rota é /api/auth/login, req.query.route será ['auth', 'login']
    let route = req.query.route || []
    let routePath = ''
    
    // Debug: log para entender o que está acontecendo
    console.log('=== ROUTE DEBUG ===')
    console.log('req.method:', req.method)
    console.log('req.url:', req.url)
    console.log('req.path:', req.path)
    console.log('req.query:', JSON.stringify(req.query))
    console.log('req.query.route:', req.query.route)
    console.log('typeof route:', typeof route)
    console.log('route is array:', Array.isArray(route))
    console.log('==================')
    
    if (Array.isArray(route)) {
      routePath = route.join('/')
    } else if (typeof route === 'string') {
      routePath = route
      route = route.split('/').filter(Boolean)
    }
    
    // Se routePath estiver vazio, tentar extrair da URL diretamente
    if (!routePath && req.url) {
      // Remove /api/ do início da URL e query string
      const urlPath = req.url.replace(/^\/api\//, '').split('?')[0]
      routePath = urlPath
      route = urlPath.split('/').filter(Boolean)
    }
    
    // Tentar extrair do path se disponível
    if (!routePath && req.path) {
      const pathParts = req.path.replace(/^\/api\//, '').split('/').filter(Boolean)
      routePath = pathParts.join('/')
      route = pathParts
    }
    
    console.log('routePath final:', routePath)
    console.log('route array:', route)
    
    // Se routePath ainda estiver vazio após todas as tentativas, retornar erro
    if (!routePath) {
      console.error('Erro: routePath está vazio')
      corsHeaders(res)
      return res.status(404).json({ 
        error: 'Rota não encontrada',
        debug: {
          url: req.url,
          path: req.path,
          query: req.query,
          method: req.method,
          route: route
        }
      })
    }
    
    const id = Array.isArray(route) && route.length > 0 ? route[route.length - 1] : null
    console.log('id extraído:', id)

    // Roteamento baseado no caminho
    let handler = null

    // Auth routes
    if (routePath === 'auth/login') {
      handler = authLogin
    } else if (routePath === 'auth/login-associado') {
      handler = authLoginAssociado
    } else if (routePath === 'auth/register') {
      handler = authRegister
    } else if (routePath === 'auth/register-associado') {
      handler = authRegisterAssociado
    } else if (routePath === 'auth/perfil') {
      handler = authPerfil
    }
    // Parceiros
    else if (routePath === 'parceiros') {
      handler = parceirosIndex
    } else if (routePath.startsWith('parceiros/') && id && id !== 'parceiros') {
      req.query.id = id
      handler = parceirosId
    }
    // Empresas
    else if (routePath === 'empresas') {
      handler = empresasIndex
    } else if (routePath === 'empresas/pendentes') {
      handler = empresasPendentes
    } else if (routePath === 'empresas/aprovar') {
      handler = empresasAprovar
    } else if (routePath.startsWith('empresas/') && id && id !== 'empresas' && id !== 'pendentes' && id !== 'aprovar') {
      req.query.id = id
      handler = empresasId
    }
    // Galeria
    else if (routePath === 'galeria') {
      handler = galeriaIndex
    } else if (routePath === 'galeria/ordem') {
      handler = galeriaOrdem
    } else if (routePath.startsWith('galeria/') && id && id !== 'galeria' && id !== 'ordem') {
      req.query.id = id
      handler = galeriaId
    }
    // Diretoria
    else if (routePath === 'diretoria') {
      handler = diretoriaIndex
    } else if (routePath.startsWith('diretoria/') && id && id !== 'diretoria') {
      req.query.id = id
      handler = diretoriaId
    }
    // Sobre
    else if (routePath === 'sobre') {
      handler = sobreIndex
    }
    // Configurações
    else if (routePath === 'configuracoes') {
      handler = configuracoesIndex
    }
    // Usuários
    else if (routePath === 'usuarios') {
      handler = usuariosIndex
    } else if (routePath.startsWith('usuarios/') && id && id !== 'usuarios') {
      req.query.id = id
      handler = usuariosId
    }
    // Benefícios
    else if (routePath === 'beneficios') {
      handler = beneficiosIndex
    } else if (routePath === 'beneficios/resgatar') {
      handler = beneficiosResgatar
    } else if (routePath === 'beneficios/resgatar-publico') {
      console.log('✓ Rota beneficios/resgatar-publico encontrada')
      handler = beneficiosResgatarPublico
    } else if (routePath === 'beneficios/resgates') {
      handler = beneficiosResgates
    } else if (routePath.startsWith('beneficios/') && id && id !== 'beneficios' && id !== 'resgatar' && id !== 'resgatar-publico' && id !== 'resgates') {
      req.query.id = id
      handler = beneficiosId
    }
    // Capacitações
    else if (routePath === 'capacitacoes') {
      handler = capacitacoesIndex
    } else if (routePath === 'capacitacoes/inscrever') {
      handler = capacitacoesInscrever
    } else if (routePath === 'capacitacoes/inscrever-publico') {
      handler = capacitacoesInscreverPublico
    } else if (routePath === 'capacitacoes/inscritos') {
      handler = capacitacoesInscritos
    } else if (routePath.startsWith('capacitacoes/') && id && id !== 'capacitacoes' && id !== 'inscrever' && id !== 'inscrever-publico' && id !== 'inscritos') {
      req.query.id = id
      handler = capacitacoesId
    }
    // Eventos
    else if (routePath === 'eventos') {
      handler = eventosIndex
    } else if (routePath === 'eventos/inscrever-publico') {
      handler = eventosInscreverPublico
    } else if (routePath === 'eventos/inscritos') {
      handler = eventosInscritos
    } else if (routePath.startsWith('eventos/') && id && id !== 'eventos' && id !== 'inscrever-publico' && id !== 'inscritos') {
      req.query.id = id
      handler = eventosId
    }
    // Notificações
    else if (routePath === 'notificacoes') {
      handler = notificacoesIndex
    } else if (routePath === 'notificacoes/marcar-todas') {
      handler = notificacoesMarcarTodas
    } else if (routePath.startsWith('notificacoes/') && id && id !== 'notificacoes' && id !== 'marcar-todas') {
      req.query.id = id
      handler = notificacoesId
    }
    // Relatórios
    else if (routePath === 'relatorios') {
      handler = relatoriosIndex
    }
    // Exportar
    else if (routePath === 'exportar') {
      handler = exportarIndex
    }
    // Consultas
    else if (routePath === 'consultas/buscar-cnpj') {
      handler = buscarCNPJ
    }
    else if (routePath === 'consultas/buscar-cep') {
      handler = buscarCEP
    }

    if (handler) {
      console.log('Handler encontrado:', handler.name || 'anonymous', 'para rota:', routePath)
      try {
        return await handler(req, res)
      } catch (handlerError) {
        console.error('Erro ao executar handler:', handlerError)
        console.error('Stack do handler:', handlerError.stack)
        corsHeaders(res)
        return res.status(500).json({ 
          error: 'Erro ao executar handler',
          message: handlerError.message,
          stack: process.env.NODE_ENV === 'development' ? handlerError.stack : undefined
        })
      }
    }

    // Rota não encontrada
    console.log('❌ Rota não encontrada:', routePath, '| route array:', route, '| id:', id)
    corsHeaders(res)
    res.status(404).json({ error: 'Rota não encontrada', routePath, route, id })
  } catch (error) {
    console.error('Erro geral no handler:', error)
    console.error('Stack:', error.stack)
    corsHeaders(res)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
