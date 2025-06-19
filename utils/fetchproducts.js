import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'

export default async function fetchProducts(url) {
  const res = await fetch(url)
  const html = await res.text()
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const produtos = [...doc.querySelectorAll('.product-grid .product-item')].map(el => {
    const img = el.querySelector('img')?.src || ''
    const nome = el.querySelector('.product-title')?.textContent?.trim() || ''
    const preco = el.querySelector('.price')?.textContent?.trim() || ''
    return { nome, preco, img }
  })

  return produtos
}
