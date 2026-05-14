import PDFDocument from 'pdfkit'

/** Textos alinhados ao documento CARTA_DE_ADESAO_AECAC_REFEITA.docx */
const TEXTO_II =
  'Eu, o(a) representante legal identificado(a) acima, declaro que solicito minha adesão voluntária à AECAC - Associação Empresarial e Comercial de Águas Claras, comprometendo-me a respeitar seu estatuto, suas finalidades institucionais e as deliberações regularmente aprovadas por seus órgãos competentes.'

const ITENS_III = [
  'A taxa única de adesão da AECAC corresponde a 20% (vinte por cento) do salário mínimo nacional vigente, devendo ser paga no ato da inscrição pelos associados que não se enquadrarem na regra de isenção para fundadores.',
  'Serão considerados associados fundadores os primeiros associados admitidos na fase de fundação e implantação da AECAC, desde que assim registrados no cadastro da associação ou em documento próprio da coordenação/diretoria.',
  'Os associados fundadores ficarão isentos da taxa única de adesão, como reconhecimento pela participação inicial na constituição e no fortalecimento da AECAC.',
  'A mensalidade dos associados fundadores será equivalente a 6% (seis por cento) do salário mínimo nacional vigente. Para os demais associados, a mensalidade será equivalente a 8% (oito por cento) do salário mínimo nacional vigente.',
  'A primeira mensalidade deverá ser paga no ato da adesão. A partir dela, o vencimento mensal ficará vinculado ao dia da adesão: se o(a) associado(a) aderir no dia 21, por exemplo, as mensalidades seguintes vencerão todo dia 21 de cada mês. Quando o mês não tiver o mesmo dia correspondente, o vencimento ocorrerá no último dia do mês.',
  'Os pagamentos deverão ser realizados preferencialmente por cartão de crédito, ou por outro meio oficialmente informado pela AECAC, com identificação do(a) associado(a) pagador(a).',
]

const ITENS_IV = [
  'Manter seus dados cadastrais atualizados junto à AECAC, informando alterações de contato, endereço, razão social, CNPJ ou representação legal.',
  'Participar, sempre que possível, das reuniões, assembleias, campanhas e demais ações promovidas pela associação.',
  'Atuar de forma colaborativa, ética e respeitosa, contribuindo para o desenvolvimento empresarial e comercial de Águas Claras.',
  'Cumprir as obrigações financeiras assumidas nesta carta de adesão e observar os prazos definidos pela AECAC.',
]

const TEXTO_V =
  'O(a) associado(a) que permanecer inadimplente por período superior a 3 (três) meses consecutivos poderá ter sua participação suspensa temporariamente ou ser desligado(a) da associação, conforme o estatuto, as normas internas e as deliberações aplicáveis da AECAC.'

const TEXTO_VI =
  'Declaro que li, compreendi e aceito os termos desta carta de adesão, inclusive as regras relativas à taxa de adesão, isenção para associados fundadores, mensalidades e vencimentos. Declaro, ainda, que as informações prestadas são verdadeiras e autorizo seu uso pela AECAC para fins cadastrais, administrativos e associativos.'

const OBSERVACAO =
  'Observação: os percentuais previstos nesta carta incidem sobre o salário mínimo nacional vigente, observadas as atualizações legais e as deliberações validamente aprovadas pela AECAC.'

/**
 * Gera PDF da Carta de Adesão (conteúdo alinhado ao .docx oficial) com assinatura digital do(a) associado(a).
 */
export function buildCartaAdesaoPdfBuffer(empresa, cartaAdesao, assinaturaPngBuffer) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const line = (t, opts = {}) => {
      doc.fillColor('#000000').fontSize(opts.size || 10).text(t, { align: opts.align || 'left', lineGap: 2, ...opts })
    }

    const sectionTitle = (t) => {
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#000000').text(t, { underline: true })
      doc.moveDown(0.35)
    }

    doc.fontSize(14).text('CARTA DE ADESÃO - AECAC', { align: 'center' })
    doc.moveDown(0.25)
    doc.fontSize(11).text('Associação Empresarial e Comercial de Águas Claras', { align: 'center' })
    doc.moveDown(0.9)

    line(`Águas Claras, ${cartaAdesao.dia} de ${cartaAdesao.mes} de 20${cartaAdesao.ano}.`, { align: 'center', size: 10 })
    doc.moveDown(1)

    sectionTitle('I. DADOS DO(A) ASSOCIADO(A)')
    line(`Nome completo: ${empresa.responsavel || '-'}`)
    line(`RG: ${cartaAdesao.rg}`)
    line(`CPF: ${cartaAdesao.cpf}`)
    line(`Telefone: ${empresa.telefone || '-'}`)
    line(`E-mail: ${empresa.email || '-'}`)
    line(`Razão Social da Empresa: ${empresa.nome || '-'}`)
    line(`CNPJ: ${empresa.cnpj || '-'}`)
    line(`Endereço: ${empresa.endereco || '-'}`)
    line(`CEP: ${empresa.cep || '-'}`)

    sectionTitle('II. DECLARAÇÃO DE ADESÃO')
    line(TEXTO_II, { align: 'justify' })

    sectionTitle('III. CONDIÇÕES FINANCEIRAS')
    ITENS_III.forEach((txt, i) => {
      line(`${i + 1}. ${txt}`, { align: 'justify' })
      doc.moveDown(0.35)
    })

    sectionTitle('IV. COMPROMISSOS DO(A) ASSOCIADO(A)')
    ITENS_IV.forEach((txt, i) => {
      line(`${i + 1}. ${txt}`, { align: 'justify' })
      doc.moveDown(0.35)
    })

    sectionTitle('V. INADIMPLÊNCIA')
    line(TEXTO_V, { align: 'justify' })

    sectionTitle('VI. CIÊNCIA E ACEITE')
    line(TEXTO_VI, { align: 'justify' })
    doc.moveDown(1)

    try {
      doc.image(assinaturaPngBuffer, {
        fit: [420, 130],
        align: 'center',
      })
    } catch {
      line('(Não foi possível incorporar a imagem da assinatura no PDF.)', { size: 9 })
    }

    doc.moveDown(0.4)
    doc.fontSize(10).fillColor('#000000').text('Assinatura do(a) Associado(a)', { align: 'center' })
    doc.moveDown(0.9)

    doc.fontSize(9).fillColor('#444444').font('Helvetica-Oblique').text(OBSERVACAO, { align: 'center' })
    doc.font('Helvetica')
    doc.moveDown(0.6)
    doc.fontSize(8).fillColor('#666666').text(`Documento gerado eletronicamente em ${new Date().toLocaleString('pt-BR')}`, {
      align: 'center',
    })

    doc.end()
  })
}
