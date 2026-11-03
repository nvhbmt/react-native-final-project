import type { CategoryId, Product } from '../types'

export const categoryNames: Record<CategoryId, string> = {
  electronics: 'Electronics',
  fashion: 'Fashion',
  beauty: 'Beauty',
  fruits: 'Fresh Fruits',
}

export const categories = [
  { id: 'electronics', name: 'Electronics', image: require('../../../../assets/marketplace/category-electronics.png') },
  { id: 'fashion', name: 'Fashion', image: require('../../../../assets/marketplace/category-fashion.png') },
  { id: 'beauty', name: 'Beauty', image: require('../../../../assets/marketplace/category-beauty.png') },
  { id: 'fruits', name: 'Fresh Fruits', image: require('../../../../assets/marketplace/category-fruits.png') },
] as const

export const electronics: Product[] = [
  { id: 'phone-white', name: 'Smartphone', category: 'electronics', subcategory: 'phone', image: require('../../../../assets/marketplace/phone-white.png'), price: 899, rating: 4, sales: 400, keywords: 'white phone' },
  { id: 'phone-blue', name: 'Smartphone', category: 'electronics', subcategory: 'phone', image: require('../../../../assets/marketplace/phone-blue.png'), price: 899, rating: 4, sales: 300, keywords: 'blue phone' },
  { id: 'phone-purple', name: 'Smartphone', category: 'electronics', subcategory: 'phone', image: require('../../../../assets/marketplace/phone-purple.png'), price: 789, rating: 4, sales: 200, keywords: 'purple phone' },
  { id: 'phone-apps', name: 'Smartphone', category: 'electronics', subcategory: 'phone', image: require('../../../../assets/marketplace/phone-apps.png'), price: 999, rating: 4, sales: 100, keywords: 'apps phone' },
  { id: 'tablet', name: 'Tablet', category: 'electronics', subcategory: 'tablet', image: require('../../../../assets/marketplace/tablet.png'), price: 499, rating: 4.5, sales: 90 },
  { id: 'laptop', name: 'Laptop', category: 'electronics', subcategory: 'laptop', image: require('../../../../assets/marketplace/subcategory-laptop.png'), price: 999, rating: 4.5, sales: 80 },
  { id: 'headphone-pro', name: 'Headphone', category: 'electronics', subcategory: 'headphone', image: require('../../../../assets/marketplace/headphone-hero.png'), price: 59, rating: 4.5, sales: 70 },
  { id: 'headphone-classic', name: 'Headphone', category: 'electronics', subcategory: 'headphone', image: require('../../../../assets/marketplace/headphone-classic.png'), price: 500, rating: 4.5, sales: 60 },
  { id: 'headphone-gold', name: 'Headphone', category: 'electronics', subcategory: 'headphone', image: require('../../../../assets/marketplace/headphone-gold.png'), price: 300, rating: 4.5, sales: 50 },
  { id: 'headphone-silver', name: 'Headphone', category: 'electronics', subcategory: 'headphone', image: require('../../../../assets/marketplace/headphone-silver.png'), price: 99, rating: 4.5, sales: 40 },
]

export const fruits: Product[] = [
  { id: 'pear', name: 'Pear', category: 'fruits', image: require('../../../../assets/marketplace/pear.png'), price: 3, rating: 4, sales: 600 },
  { id: 'avocado', name: 'Avocado', category: 'fruits', image: require('../../../../assets/marketplace/avocado.png'), price: 4, rating: 4, sales: 500 },
  { id: 'cherry', name: 'Cherry', category: 'fruits', image: require('../../../../assets/marketplace/cherry.png'), price: 10, rating: 5, sales: 400 },
  { id: 'orange', name: 'Orange', category: 'fruits', image: require('../../../../assets/marketplace/orange.png'), price: 7, rating: 4.5, sales: 300 },
]

export const relevantFruits: Product[] = [
  { id: 'peach', name: 'Peach', category: 'fruits', image: require('../../../../assets/marketplace/peach.png'), price: 15, rating: 4, sales: 200 },
  { id: 'pomegranate', name: 'Pomegranate', category: 'fruits', image: require('../../../../assets/marketplace/pomegranate.png'), price: 23, rating: 4, sales: 100 },
]

const shoes: Product = { id: 'boots', name: 'Shoes', category: 'fashion', image: require('../../../../assets/marketplace/boots.png'), price: 299, rating: 4.5, sales: 300 }
const hoodie: Product = { id: 'hoodie-shirt', name: 'Hoodie shirt', category: 'fashion', image: require('../../../../assets/marketplace/hoodie-hero.png'), price: 2.99, rating: 4.5, sales: 200, keywords: 't-shirt clothing' }
const legacyPhones: Product[] = [
  { id: 'smartphone-x', name: 'Smartphone', category: 'electronics', image: require('../../../../assets/marketplace/phone-white.png'), price: 1000, rating: 4.5, sales: 30 },
  { id: 'smartphone-mini', name: 'Smartphone', category: 'electronics', image: require('../../../../assets/marketplace/phone-blue.png'), price: 1000, rating: 4.5, sales: 20 },
]

export const recommendedProducts: Product[] = [shoes, electronics[4], fruits[0]]
export const allProducts: Product[] = [...electronics, ...fruits, ...relevantFruits, shoes, hoodie, ...legacyPhones]

export const electronicCategories = [
  { id: 'phone', name: 'Smartphones', image: require('../../../../assets/marketplace/subcategory-phone.png') },
  { id: 'tablet', name: 'Tablets', image: require('../../../../assets/marketplace/subcategory-tablet.png') },
  { id: 'laptop', name: 'Laptops', image: require('../../../../assets/marketplace/subcategory-laptop.png') },
] as const
