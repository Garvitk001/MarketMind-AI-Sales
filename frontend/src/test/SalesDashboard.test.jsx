import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SalesDashboard } from '../components/dashboards/SalesDashboard'

const mockAddToast = vi.fn()
const mockOnNavigate = vi.fn()

const mockSalesDashboard = {
  currency: 'INR',
  revenue: { value: 145200 },
  transaction_count: { value: 24 },
  average_order_value: { value: 6050 },
  quantity: { value: 320 },
  revenue_series: [
    { date: '2026-09-01', revenue: 18500 },
    { date: '2026-09-02', revenue: 24200 },
  ],
}

vi.mock('../context/DataContext', () => ({
  useData: () => ({
    salesDashboard: mockSalesDashboard,
    salesDateRange: { from: '2026-08-01', to: '2026-08-31' },
    applySalesDateRange: vi.fn(),
    isLoading: false,
  }),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}))

describe('SalesDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sales executive workspace, target progress, and client opportunities correctly', async () => {
    render(<SalesDashboard onNavigate={mockOnNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Sales Executive Command Hub')).toBeInTheDocument()
      expect(screen.getByText('Monthly Revenue Target Progress')).toBeInTheDocument()
      expect(screen.getByText('High-Probability B2B Client Opportunities')).toBeInTheDocument()
    })
  })
})
