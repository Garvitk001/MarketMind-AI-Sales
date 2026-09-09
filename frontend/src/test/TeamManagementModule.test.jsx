import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TeamManagementModule } from '../components/modules/TeamManagementModule'

const mockApi = vi.fn()
const mockReauthenticate = vi.fn()
const mockRefresh = vi.fn()
const mockAddToast = vi.fn()
const mockUsers = []

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    api: mockApi,
    reauthenticate: mockReauthenticate,
    currentRole: { id: 'owner' },
  }),
}))

vi.mock('../context/DataContext', () => ({
  useData: () => ({
    users: mockUsers,
    refresh: mockRefresh,
  }),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}))

describe('TeamManagementModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockApi.mockImplementation((endpoint) => {
      if (endpoint.startsWith('/team/overview')) {
        return Promise.resolve({
          total_employees: 3,
          active_employees: 3,
          below_target: 1,
          top_performer: {
            full_name: 'Rahul Sharma',
            metrics: { revenue: 145200 },
          },
          employees: [
            {
              employee_id: 'emp-1',
              full_name: 'Rahul Sharma',
              email: 'rahul@example.com',
              role_code: 'sales_executive',
              role_name: 'Sales Executive',
              store_id: 'store-1',
              store_name: 'Main Store',
              status: 'active',
              metrics: { revenue: 145200, transactions: 24, average_order_value: 6050, customers_handled: 18 },
              performance_level: 'excellent',
              trend: [],
              insights: [],
            },
          ],
        })
      }
      if (endpoint === '/users/roles/catalog') {
        return Promise.resolve([
          { code: 'store_manager', name: 'Store Manager' },
          { code: 'sales_executive', name: 'Sales Executive' },
        ])
      }
      if (endpoint === '/users/stores/catalog') {
        return Promise.resolve([
          { id: 'store-1', name: 'Main Store', code: 'DEL-01' },
        ])
      }
      return Promise.resolve({})
    })
  })

  it('renders team overview metrics and employee row correctly', async () => {
    render(<TeamManagementModule />)

    await waitFor(() => {
      expect(screen.getByText('Team Performance & Access Management')).toBeInTheDocument()
      expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThan(0)
      expect(screen.getByText('Export Team Report (CSV)')).toBeInTheDocument()
    })
  })

  it('opens employee edit and analyse modal when clicking Edit & Analyse button', async () => {
    render(<TeamManagementModule />)

    await waitFor(() => {
      expect(screen.getByText('Edit & Analyse')).toBeInTheDocument()
    })

    screen.getByText('Edit & Analyse').click()

    await waitFor(() => {
      expect(screen.getByText('Edit Employee Profile & Store Location Permissions')).toBeInTheDocument()
      expect(screen.getByText('Save Details')).toBeInTheDocument()
      expect(screen.getByText('Delete Employee')).toBeInTheDocument()
    })
  })
})
