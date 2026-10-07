import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { AnalyticsCenterView } from './components/AnalyticsCenterView';
import { OrdersView } from './components/OrdersView';
import { CustomersView } from './components/CustomersView';
import { AccountsView } from './components/AccountsView';
import { ExpensesView } from './components/ExpensesView';
import { ShipmentsView } from './components/ShipmentsView';
import { JournalView } from './components/JournalView';
import { ReceivablesEquityView } from './components/ReceivablesEquityView';
import { AssistantView } from './components/AssistantView';
import { SettingsView } from './components/SettingsView';
import { MarketingView } from './components/MarketingView';
import { PurchaseBatchesView } from './components/PurchaseBatchesView';
import { InstallmentsView } from './components/InstallmentsView';
import { CouriersView } from './components/CouriersView';
import { DataImportView } from './components/import/DataImportView';
import { InvoicesView } from './components/InvoicesView';

// Modals
import { NewOrderModal } from './components/modals/NewOrderModal';
import { PaymentModal } from './components/modals/PaymentModal';
import { TransferModal } from './components/modals/TransferModal';
import { NewCustomerModal } from './components/modals/NewCustomerModal';
import { NewExpenseModal } from './components/modals/NewExpenseModal';
import { CustomerStatementModal } from './components/modals/CustomerStatementModal';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { AddAccountModal } from './components/modals/AddAccountModal';
import { NewShipmentModal } from './components/modals/NewShipmentModal';
import { NewReceivableModal } from './components/modals/NewReceivableModal';
import { ExportBackupModal } from './components/modals/ExportBackupModal';
import { RecordAccountTransactionModal } from './components/modals/RecordAccountTransactionModal';

// Mobile Components
import { MobileBottomNav } from './components/mobile/MobileBottomNav';
import { MobileQuickActionsSheet } from './components/mobile/MobileQuickActionsSheet';
import { MobileAllSectionsSheet } from './components/mobile/MobileAllSectionsSheet';

import { Customer, Order, Payment } from './types';

const MainApp: React.FC = () => {
  const { notification } = useStore();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Mobile Bottom Sheets
  const [isMobileQuickActionsOpen, setIsMobileQuickActionsOpen] = useState(false);
  const [isMobileAllSectionsOpen, setIsMobileAllSectionsOpen] = useState(false);

  // Inflow / Outflow Record Modal state
  const [recordModalConfig, setRecordModalConfig] = useState<{
    isOpen: boolean;
    type: 'deposit' | 'withdrawal';
    accountId?: number;
  }>({
    isOpen: false,
    type: 'deposit'
  });

  // Modal states
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false);
  const [isNewReceivableOpen, setIsNewReceivableOpen] = useState(false);
  const [isExportBackupOpen, setIsExportBackupOpen] = useState(false);

  // Contextual modal selections
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isInvoiceGeneratorOpen, setIsInvoiceGeneratorOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [transferFromAccountId, setTransferFromAccountId] = useState<number | undefined>(undefined);

  // Handlers
  const handleOpenPaymentForCustomer = (customer: Customer, order?: Order) => {
    setPaymentCustomer(customer);
    setPaymentOrder(order || null);
    setIsPaymentOpen(true);
  };

  const handleOpenPaymentForOrder = (order: Order) => {
    setPaymentOrder(order);
    setPaymentCustomer(null);
    setIsPaymentOpen(true);
  };

  const handleOpenReceipt = (payment: Payment) => {
    setReceiptPayment(payment);
  };

  const handleOpenOrderInvoice = (order: Order) => {
    setInvoiceOrder(order);
    setIsInvoiceGeneratorOpen(true);
  };

  const handleOpenInvoiceGenerator = (order?: Order) => {
    setInvoiceOrder(order || null);
    setIsInvoiceGeneratorOpen(true);
  };

  const handleOpenTransferForAccount = (accountId: number) => {
    setTransferFromAccountId(accountId);
    setIsTransferOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800" dir="rtl">
      
      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 pointer-events-none">
          <div
            className={`pointer-events-auto p-3.5 rounded-xl shadow-xl border flex items-center gap-2.5 backdrop-blur-md transition-all ${
              notification.type === 'error'
                ? 'bg-rose-950/90 text-white border-rose-700 shadow-rose-900/20'
                : notification.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-700 shadow-amber-900/20'
                : 'bg-slate-900/90 text-emerald-300 border-emerald-500/30 shadow-black/20'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              notification.type === 'error' ? 'bg-rose-400' : notification.type === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className="text-xs font-bold flex-1">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <Header
        onOpenNewOrder={() => setIsNewOrderOpen(true)}
        onOpenPayment={() => {
          setPaymentCustomer(null);
          setPaymentOrder(null);
          setIsPaymentOpen(true);
        }}
        onOpenTransfer={() => {
          setTransferFromAccountId(undefined);
          setIsTransferOpen(true);
        }}
        onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
        onOpenNewExpense={() => setIsNewExpenseOpen(true)}
        onOpenBackup={() => setIsExportBackupOpen(true)}
        onOpenAssistant={() => setActiveTab('assistant')}
        onNavigate={setActiveTab}
      />

      {/* Main Container with Mobile Bottom Nav Padding */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 pt-3 pb-24 md:py-5 md:pb-8 space-y-4 md:space-y-5 flex-1">
        
        {/* Navigation Tabs */}
        <Navigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Dynamic View Rendering */}
        <div className="transition-all duration-200">
          {activeTab === 'dashboard' && (
            <Dashboard
              onNavigate={setActiveTab}
              onOpenNewOrder={() => setIsNewOrderOpen(true)}
              onOpenPayment={() => {
                setPaymentCustomer(null);
                setPaymentOrder(null);
                setIsPaymentOpen(true);
              }}
              onOpenTransfer={() => {
                setTransferFromAccountId(undefined);
                setIsTransferOpen(true);
              }}
              onOpenBackup={() => setIsExportBackupOpen(true)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsCenterView onNavigate={setActiveTab} />
          )}

          {activeTab === 'orders' && (
            <OrdersView
              onOpenNewOrder={() => setIsNewOrderOpen(true)}
              onOpenPaymentForOrder={handleOpenPaymentForOrder}
              onViewInvoice={order => setInvoiceOrder(order)}
            />
          )}

          {activeTab === 'couriers' && <CouriersView />}

          {activeTab === 'installments' && <InstallmentsView />}

          {activeTab === 'invoices' && <InvoicesView />}

          {activeTab === 'purchase-batches' && <PurchaseBatchesView />}

          {activeTab === 'marketing' && <MarketingView />}

          {activeTab === 'customers' && (
            <CustomersView
              onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
              onOpenPaymentForCustomer={handleOpenPaymentForCustomer}
              onViewStatement={customer => setStatementCustomer(customer)}
              onOpenOrderInvoice={handleOpenOrderInvoice}
              onOpenReceipt={handleOpenReceipt}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              onOpenAddAccount={() => setIsAddAccountOpen(true)}
              onOpenTransfer={handleOpenTransferForAccount}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView onOpenNewExpense={() => setIsNewExpenseOpen(true)} />
          )}

          {activeTab === 'shipments' && (
            <ShipmentsView onOpenNewShipment={() => setIsNewShipmentOpen(true)} />
          )}

          {activeTab === 'journal' && <JournalView />}

          {activeTab === 'receivables' && (
            <ReceivablesEquityView
              onOpenAddReceivable={() => setIsNewReceivableOpen(true)}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantView onNavigate={setActiveTab} />
          )}

          {activeTab === 'data-import' && <DataImportView />}

          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            نظام توب ستور المحاسبي المتكامل © {new Date().getFullYear()} — صنعاء، الجمهورية اليمنية
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>الريال اليمني (YER)</span>
            <span>•</span>
            <span>قيود اليومية المزدوجة الآلية</span>
            <span>•</span>
            <span>تحديث فوري للأرصدة</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setPaymentCustomer(null);
          setPaymentOrder(null);
        }}
        preSelectedCustomer={paymentCustomer}
        preSelectedOrder={paymentOrder}
        onPaymentSuccess={handleOpenReceipt}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setTransferFromAccountId(undefined);
        }}
        preSelectedFromAccountId={transferFromAccountId}
      />

      <NewCustomerModal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
      />

      <NewExpenseModal
        isOpen={isNewExpenseOpen}
        onClose={() => setIsNewExpenseOpen(false)}
      />

      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
      />

      <NewShipmentModal
        isOpen={isNewShipmentOpen}
        onClose={() => setIsNewShipmentOpen(false)}
      />

      <NewReceivableModal
        isOpen={isNewReceivableOpen}
        onClose={() => setIsNewReceivableOpen(false)}
      />

      <CustomerStatementModal
        isOpen={!!statementCustomer}
        customer={statementCustomer}
        onClose={() => setStatementCustomer(null)}
        onOpenPaymentForCustomer={handleOpenPaymentForCustomer}
        onOpenOrderInvoice={handleOpenOrderInvoice}
        onOpenReceipt={handleOpenReceipt}
      />

      <InvoiceModal
        isOpen={isInvoiceGeneratorOpen || !!invoiceOrder}
        order={invoiceOrder}
        onClose={() => {
          setIsInvoiceGeneratorOpen(false);
          setInvoiceOrder(null);
        }}
        onOpenReceipt={handleOpenReceipt}
        onOpenNewOrder={() => setIsNewOrderOpen(true)}
      />

      <ReceiptModal
        isOpen={!!receiptPayment}
        payment={receiptPayment}
        onClose={() => setReceiptPayment(null)}
      />

      <ExportBackupModal
        isOpen={isExportBackupOpen}
        onClose={() => setIsExportBackupOpen(false)}
      />

      {/* Record Account Inflow/Outflow Modal */}
      <RecordAccountTransactionModal
        isOpen={recordModalConfig.isOpen}
        onClose={() => setRecordModalConfig(prev => ({ ...prev, isOpen: false }))}
        initialType={recordModalConfig.type}
        initialAccountId={recordModalConfig.accountId}
      />

      {/* Mobile Sticky Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQuickActions={() => setIsMobileQuickActionsOpen(true)}
        onOpenAllSections={() => setIsMobileAllSectionsOpen(true)}
      />

      {/* Mobile Quick Action Bottom Sheet (+) */}
      <MobileQuickActionsSheet
        isOpen={isMobileQuickActionsOpen}
        onClose={() => setIsMobileQuickActionsOpen(false)}
        onOpenNewOrder={() => setIsNewOrderOpen(true)}
        onOpenInvoice={() => handleOpenInvoiceGenerator()}
        onOpenPayment={() => {
          setPaymentCustomer(null);
          setPaymentOrder(null);
          setIsPaymentOpen(true);
        }}
        onOpenRecordInflow={() => setRecordModalConfig({ isOpen: true, type: 'deposit' })}
        onOpenRecordOutflow={() => setRecordModalConfig({ isOpen: true, type: 'withdrawal' })}
        onOpenNewExpense={() => setIsNewExpenseOpen(true)}
        onOpenTransfer={() => {
          setTransferFromAccountId(undefined);
          setIsTransferOpen(true);
        }}
        onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
        onOpenAssistant={() => setActiveTab('assistant')}
        onOpenBackup={() => setIsExportBackupOpen(true)}
      />

      {/* Mobile Full All-Sections Drawer Sheet */}
      <MobileAllSectionsSheet
        isOpen={isMobileAllSectionsOpen}
        onClose={() => setIsMobileAllSectionsOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenBackup={() => setIsExportBackupOpen(true)}
      />

    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}
