import type { Product } from '../types'

// Dữ liệu giả lập — thay bằng API thật trong `api/productApi.ts`.
const unsplash = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`

const avatar = (n: number) => `https://i.pravatar.cc/120?img=${n}`

const LOREM_DESC =
  'Quis occaecat magna elit magna do nisi ipsum amet excepteur tempor nisi exercitation qui irure laboris. Laboris ad sint dolore fugiat ullamco aliqua nisi cupidatat consectetur.'

const commonReviews = [
  {
    id: 'r1',
    author: 'Jevon Raynor',
    avatar: avatar(32),
    content: 'Deserunt minim incididunt cillum',
    createdAt: 'A day ago',
  },
  {
    id: 'r2',
    author: 'Jason D.',
    avatar: avatar(12),
    content: 'Magna pariatur sit et ullamco paria',
    createdAt: '3 days ago',
  },
]

export const PRODUCTS: Product[] = [
  {
    id: 'headphone-pro',
    name: 'Headphone',
    category: 'Headphone',
    subtitle: 'Consequat ex eu',
    description: LOREM_DESC,
    price: 59,
    images: [
      unsplash('1618366712010-f4ae9c647dcb'),
      unsplash('1546435770-a3e426bf472b'),
      unsplash('1583394838336-acd977736f90'),
      unsplash('1572536147248-ac59a8abfa4b'),
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
    images: [unsplash('1583394838336-acd977736f90')],
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
    images: [unsplash('1505740420928-5e560c06d30e')],
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
    images: [unsplash('1487215078519-e21cc028cb29')],
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
    images: [unsplash('1511707171634-5f897ff02aa9')],
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
    images: [unsplash('1592899677977-9c10ca588bbd')],
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
      unsplash('1529139574466-a303027c1d8b'),
      unsplash('1524504388940-b1c1722653e1'),
      unsplash('1515886657613-9f3515b0c78f'),
      unsplash('1509631179647-0177331693ae'),
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
  },
]
