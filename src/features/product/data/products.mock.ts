import type { Product, ProductReview, SizeChart } from '../types'

// Dữ liệu giả lập — thay bằng API thật trong `api/productApi.ts`.
const avatar = (n: number) => `https://i.pravatar.cc/120?img=${n}`

const LOREM_DESC =
  'Quis occaecat magna elit magna do nisi ipsum amet excepteur tempor nisi exercitation qui irure laboris. Laboris ad sint dolore fugiat ullamco aliqua nisi cupidatat consectetur.'

// Hai review đầu khớp design trang chi tiết; phần còn lại cho trang "Reviews".
const commonReviews: ProductReview[] = [
  { id: 'r1', author: 'Jevon Raynor', avatar: avatar(32), rating: 5, content: 'Deserunt minim incididunt cillum', createdAt: 'A day ago' },
  { id: 'r2', author: 'Jason D.', avatar: avatar(12), rating: 4, content: 'Magna pariatur sit et ullamco paria', createdAt: '3 days ago' },
  { id: 'r3', author: 'Mia Tran', avatar: avatar(45), rating: 5, content: 'Ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.', createdAt: '5 days ago' },
  { id: 'r4', author: 'Oliver K.', avatar: avatar(53), rating: 4, content: 'Excepteur sint occaecat cupidatat non proident.', createdAt: '1 week ago' },
  { id: 'r5', author: 'Hannah Lee', avatar: avatar(44), rating: 3, content: 'Sunt in culpa qui officia deserunt mollit anim id est laborum.', createdAt: '1 week ago' },
  { id: 'r6', author: 'Lucas P.', avatar: avatar(60), rating: 5, content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.', createdAt: '2 weeks ago' },
  { id: 'r7', author: 'Sofia M.', avatar: avatar(25), rating: 2, content: 'Nostrud exercitation ullamco laboris nisi ut aliquip.', createdAt: '3 weeks ago' },
  { id: 'r8', author: 'Ethan W.', avatar: avatar(68), rating: 1, content: 'Voluptate velit esse cillum dolore eu fugiat nulla pariatur.', createdAt: '1 month ago' },
]

// Bảng size áo (cm). Trang Size guide tự đổi sang inch.
const TOP_SIZE_CHART: SizeChart = {
  columns: [
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'length', label: 'Length' },
  ],
  rows: [
    { size: 'XS', cm: { chest: 84, waist: 70, length: 64 } },
    { size: 'S', cm: { chest: 90, waist: 76, length: 66 } },
    { size: 'M', cm: { chest: 96, waist: 82, length: 68 } },
    { size: 'L', cm: { chest: 102, waist: 88, length: 70 } },
    { size: 'XL', cm: { chest: 108, waist: 94, length: 72 } },
  ],
}

export const PRODUCTS: Product[] = [
  {
    id: 'headphone-pro',
    name: 'Headphone',
    category: 'Headphone',
    subtitle: 'Consequat ex eu',
    description: LOREM_DESC,
    price: 59,
    images: [
      require('../../../../assets/marketplace/headphone-hero.png'),
      require('../../../../assets/marketplace/headphone-classic.png'),
      require('../../../../assets/marketplace/headphone-gold.png'),
      require('../../../../assets/marketplace/headphone-silver.png'),
    ],
    rating: 4.5,
    reviewCount: 99,
    ratingBreakdown: [70, 48, 20, 10, 3],
    reviews: commonReviews,
    features: [
      { icon: 'express', label: 'Express' },
      { icon: 'return', label: '30-day free return' },
      { icon: 'review', label: 'Good review' },
      { icon: 'authorized', label: 'Authorized shop' },
    ],
    relatedIds: ['headphone-classic', 'headphone-gold', 'headphone-silver'],
  },
  {
    id: 'headphone-classic',
    name: 'Headphone',
    category: 'Headphone',
    subtitle: 'Consequat ex eu',
    description: LOREM_DESC,
    price: 500,
    images: [require('../../../../assets/marketplace/headphone-classic.png')],
    rating: 4.5,
    reviewCount: 99,
    ratingBreakdown: [70, 48, 20, 10, 3],
    reviews: commonReviews,
    relatedIds: ['headphone-pro', 'headphone-gold'],
  },
  {
    id: 'headphone-gold',
    name: 'Headphone',
    category: 'Headphone',
    subtitle: 'Consequat ex eu',
    description: LOREM_DESC,
    price: 300,
    images: [require('../../../../assets/marketplace/headphone-gold.png')],
    rating: 4.5,
    reviewCount: 99,
    ratingBreakdown: [70, 48, 20, 10, 3],
    reviews: commonReviews,
    relatedIds: ['headphone-pro', 'headphone-classic'],
  },
  {
    id: 'headphone-silver',
    name: 'Headphone',
    category: 'Headphone',
    subtitle: 'Consequat ex eu',
    description: LOREM_DESC,
    price: 99,
    images: [require('../../../../assets/marketplace/headphone-silver.png')],
    rating: 4.5,
    reviewCount: 99,
    ratingBreakdown: [70, 48, 20, 10, 3],
    reviews: commonReviews,
    relatedIds: ['headphone-pro', 'headphone-gold'],
  },
  {
    id: 'smartphone-x',
    name: 'Smartphone',
    category: 'Smartphone',
    subtitle: 'Consequat ex eu',
    description: LOREM_DESC,
    price: 1000,
    images: [require('../../../../assets/marketplace/phone-white.png')],
    rating: 4.5,
    reviewCount: 99,
    ratingBreakdown: [70, 48, 20, 10, 3],
    reviews: commonReviews,
    relatedIds: ['smartphone-mini'],
  },
  {
    id: 'smartphone-mini',
    name: 'Smartphone',
    category: 'Smartphone',
    subtitle: 'Consequat ex eu',
    description: LOREM_DESC,
    price: 1000,
    images: [require('../../../../assets/marketplace/phone-blue.png')],
    rating: 4.5,
    reviewCount: 99,
    ratingBreakdown: [70, 48, 20, 10, 3],
    reviews: commonReviews,
    relatedIds: ['smartphone-x'],
  },
  {
    id: 'hoodie-shirt',
    name: 'Hoodie shirt',
    category: 'T-Shirt',
    subtitle: 'Occaecat est deserunt tempor offici',
    description: LOREM_DESC,
    price: 2.99,
    promoLabel: 'Buy 1 get 1',
    images: [
      require('../../../../assets/marketplace/hoodie-green.png'),
      require('../../../../assets/marketplace/hoodie-black.png'),
      require('../../../../assets/marketplace/hoodie-hero.png'),
      require('../../../../assets/marketplace/hoodie-red.png'),
    ],
    rating: 4.5,
    reviewCount: 99,
    ratingBreakdown: [70, 48, 20, 10, 3],
    reviews: commonReviews,
    variants: {
      colors: [
        { id: 'red', name: 'Red', hex: '#9e1d1d' },
        { id: 'orange', name: 'Orange', hex: '#e92e00' },
        { id: 'blue', name: 'Blue', hex: '#4069e5' },
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    sizeChart: TOP_SIZE_CHART,
  },
]
