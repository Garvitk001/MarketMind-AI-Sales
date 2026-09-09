import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminDashboard } from '../components/dashboards/AdminDashboard';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ThemeProvider } from '../context/ThemeContext';

const renderAdminDashboard = () => {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AdminDashboard />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

describe('Admin Dashboard Platform Operations & Governance', () => {
  it('renders Business Owners with emails, phone numbers, and employee details', () => {
    renderAdminDashboard();

    expect(screen.getByText('Platform Governance & Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('RESTRICTED SYSTEM ROOT • PLATFORM ADMIN CONSOLE')).toBeInTheDocument();

    // Verify Business Owners and Phone Numbers
    expect(screen.getByText('Aravali Retail Group')).toBeInTheDocument();
    expect(screen.getByText('+91 98201 45678')).toBeInTheDocument();
    expect(screen.getByText('owner.demo@marketmind.example.com')).toBeInTheDocument();

    // Verify Employees with Phone Numbers
    expect(screen.getByText('Vikram Mehta')).toBeInTheDocument();
    expect(screen.getByText('+91 98111 22334')).toBeInTheDocument();
    expect(screen.getByText('+91 98777 66554')).toBeInTheDocument();
  });

  it('navigates to Error Handling & Diagnostics tab and displays error logs', () => {
    renderAdminDashboard();

    const errorTab = screen.getByText('Error Handling & Diagnostics');
    fireEvent.click(errorTab);

    expect(screen.getByText('System Error & Exception Diagnostic Center')).toBeInTheDocument();
    expect(screen.getByText('Simulate Test Error')).toBeInTheDocument();
    expect(screen.getByText('RESEND_DISPATCH_TIMEOUT')).toBeInTheDocument();
    expect(screen.getByText('ISOLATION_FOREST_MIN_SAMPLES_WARN')).toBeInTheDocument();
  });

  it('navigates to AI Models & Retrain Schedules and displays last trained dates', () => {
    renderAdminDashboard();

    const aiTab = screen.getByText('AI Models & Retrain Schedules');
    fireEvent.click(aiTab);

    expect(screen.getByText('AI Inference Engines & Training Schedules')).toBeInTheDocument();
    expect(screen.getAllByText('Sales & Revenue Demand Forecasting').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Last Trained:').length).toBeGreaterThanOrEqual(1);
  });
});
