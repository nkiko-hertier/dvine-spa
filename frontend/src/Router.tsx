import { Route, Switch } from 'wouter';
import { AppShell } from '@/components/AppShell';
import { HomePage } from '@/pages/HomePage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerPage } from '@/pages/CustomerPage';
import { CatalogPage } from '@/pages/CatalogPage';
import { TeamPage } from '@/pages/TeamPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/workspace" component={HomePage} />
        <Route path="/workspace/analytics" component={AnalyticsPage} />
        <Route path="/workspace/customers/:id" component={CustomerPage} />
        <Route path="/workspace/customers" component={CustomersPage} />
        <Route path="/workspace/catalog" component={CatalogPage} />
        <Route path="/workspace/team" component={TeamPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </AppShell>
  );
}
