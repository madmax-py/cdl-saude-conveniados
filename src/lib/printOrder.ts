import { api } from '../api/client'

// Abre o PDF da guia (o mesmo do painel web) numa aba nova, pronto para
// imprimir. A aba é aberta antes do download, ainda dentro do clique, senão o
// navegador a trata como pop-up e bloqueia.
export async function printOrder(orderId: number) {
  const tab = window.open('', '_blank')
  try {
    const pdf = await api.blob(`/orders/${orderId}/pdf`)
    const url = URL.createObjectURL(pdf)
    if (tab) tab.location.href = url
    else window.location.href = url
    // Dá tempo de a aba carregar o arquivo antes de liberar a memória.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}
