import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OwnerDashboard } from '../components/dashboards/OwnerDashboard'

const mockApi = vi.fn()
const mockAddToast = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    api: mockApi,
    profile: {
      preferences: {
        stock_alerts_enabled: true,
      },
    },
  }),
}))

vi.mock('../context/DataContext', () => ({
  useData: () => ({
    salesDateRange: { from: '2026-09-01', to: '2026-09-07' },
    salesDashboard: {
      currency: 'INR',
      revenue: { value: 250000 },
      transaction_count: { value: 45 },
      trend: [{ date: '2026-09-01', revenue: 50000 }],
      outstanding_credit: 12000,
    },
    customerSummary: {
      customer_count: 32,
      outstanding_receivables: 12000,
    },
  }),
}))

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
  }),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}))

describe('OwnerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockApi.mockImplementation((endpoint) => {
      if (endpoint.startsWith('/team/overview')) {
        return Promise.resolve({
          employees: [
            {
              employee_id: 'emp-101',
              full_name: 'Priya Verma',
              role_code: 'sales_executive',
              role_name: 'Sales Executive',
              store_name: 'Flagship Metro Store',
              metrics: { revenue: 85000, transactions: 15, items_sold: 40, average_order_value: 5666 },
              target: { target_value: 100000, completion_percentage: 85 },
              status: 'active',
              performance_level: 'on_track',
            },
          ],
        })
      }
      return Promise.resolve({})
    })
  })

  it('renders owner dashboard overview, executive telemetry, and individual sales executives', async () => {
    render(<OwnerDashboard onNavigate={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Wholesale & Business Operations Overview')).toBeInTheDocument()
      expect(screen.getByText('Individual Sales Executive Sales Telemetry')).toBeInTheDocument()
      expect(screen.getByText('Priya Verma')).toBeInTheDocument()
    })
  })
})
