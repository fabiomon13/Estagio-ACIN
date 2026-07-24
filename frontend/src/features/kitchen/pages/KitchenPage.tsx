import { useState } from 'react';
import Button from '../../../components/ui/button/Button';
import { PlusIcon } from '../../../components/icons';
import Input from '../../../components/ui/input/Input';
import Badge from '../../../components/ui/badge/Badge';
import ConfirmDialog from '../../../components/ui/confirm-dialog/ConfirmDialog';
import Alert from '../../../components/ui/alert/Alert';
import { useToast } from '../../../components/ui/toast/useToast';
import Switch from '../../../components/ui/switch/Switch';
import Radio from '../../../components/ui/radio/Radio';
import SearchInput from '../../../components/ui/search-input/SearchInput';
import Textarea from '../../../components/ui/textarea/Textarea';
import Checkbox from '../../../components/ui/checkbox/Checkbox';
import { useAuth } from '../../auth/hooks/useAuth';

export function KitchenPage() {
  const [isDefaultDialogOpen, setIsDefaultDialogOpen] = useState(false);
  const [isDangerDialogOpen, setIsDangerDialogOpen] = useState(false);
  const [isLoadingDialogOpen, setIsLoadingDialogOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDismissibleAlertVisible, setIsDismissibleAlertVisible] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
  const [notifyWaiter, setNotifyWaiter] = useState(false);
  const { showToast } = useToast();
  const { logout } = useAuth();

  const handleLoadingConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      setIsLoadingDialogOpen(false);
    }, 1500);
  };

  return (
    <div className="bg-background">
      <h1>Kitchen</h1>

      <div className="p-5">
        <Button variant="outline" onClick={() => logout()}>
          Log out
        </Button>
      </div>

      <section className="p-5 flex flex-col gap-4 max-w-2xl">
        <Alert variant="info" title="New feature">
          You can now mark orders as ready directly from this screen.
        </Alert>

        <Alert variant="success" title="Order ready">
          Table 7's order has been marked as ready and the waiter was notified.
        </Alert>

        <Alert variant="warning" title="Running behind">
          Table 2's order has been in the queue for over 20 minutes.
        </Alert>

        <Alert variant="danger" title="Order cancelled">
          Table 9's order was cancelled and removed from the queue.
        </Alert>

        <Alert variant="default">No title, just a plain message.</Alert>

        <Alert variant="warning" title="Long content wraps instead of overflowing">
          This description is intentionally long to check that it wraps correctly and the dismiss
          button stays put on narrow screens instead of getting pushed off to the side or causing
          the alert to overflow horizontally.
        </Alert>

        {isDismissibleAlertVisible && (
          <Alert
            variant="info"
            title="Dismissible alert"
            onClose={() => setIsDismissibleAlertVisible(false)}
          >
            Click the close button to dismiss this one.
          </Alert>
        )}
      </section>

      <section className="p-5 flex flex-col gap-4">
        <Switch
          label="Auto-accept orders"
          checked={autoAcceptOrders}
          onChange={(event) => setAutoAcceptOrders(event.target.checked)}
        />

        <Switch label="Checked by default" defaultChecked />

        <Switch label="Disabled off" disabled />

        <Switch label="Disabled on" disabled defaultChecked />

        <Switch />
      </section>

      <section className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Radio
            name="sort-order"
            label="Oldest first"
            checked={sortOrder === 'oldest'}
            onChange={() => setSortOrder('oldest')}
          />
          <Radio
            name="sort-order"
            label="Newest first"
            checked={sortOrder === 'newest'}
            onChange={() => setSortOrder('newest')}
          />
        </div>

        <Radio name="radio-demo-disabled-off" label="Disabled off" disabled />

        <Radio name="radio-demo-disabled-on" label="Disabled on" disabled defaultChecked />

        <Radio name="radio-demo-bare" />
      </section>

      <section className="p-5 flex flex-col gap-4 max-w-sm">
        <SearchInput size="md" placeholder="Medium" />
        <SearchInput size="lg" placeholder="Large" />

        <SearchInput label="With label" placeholder="Search orders..." />

        <SearchInput label="Disabled" placeholder="Can't touch this" disabled />
      </section>

      <section className="p-5 flex flex-col gap-4 max-w-sm">
        <Textarea label="Notes" placeholder="Add a note for the kitchen..." />

        <Textarea label="With error" placeholder="Required field" error="This field is required." />

        <Textarea label="Disabled" placeholder="Can't touch this" disabled />
      </section>

      <section className="p-5 flex flex-col gap-4">
        <Checkbox
          label="Notify waiter (primary)"
          checked={notifyWaiter}
          onChange={(event) => setNotifyWaiter(event.target.checked)}
        />

        <Checkbox variant="white" label="Checked by default (white)" defaultChecked />

        <Checkbox label="Disabled off" disabled />

        <Checkbox label="Disabled on" disabled defaultChecked />

        <Checkbox />
      </section>

      <div className="p-5 flex flex-wrap gap-5">
        <Button
          variant="secondary"
          onClick={() => showToast({ variant: 'default', title: 'Default toast' })}
        >
          Show default toast
        </Button>

        <Button
          variant="primary"
          disabled
          onClick={() =>
            showToast({
              variant: 'success',
              title: 'Order ready',
              description: 'Table 7 is ready to serve.',
            })
          }
        >
          Show success toast
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            showToast({
              variant: 'warning',
              title: 'Running behind',
              description: 'Table 2 has been waiting for 20+ minutes.',
            })
          }
        >
          Show warning toast
        </Button>

        <Button
          variant="danger"
          onClick={() =>
            showToast({
              variant: 'danger',
              title: 'Order cancelled',
              description: 'Table 9 was removed from the queue.',
            })
          }
        >
          Show danger toast
        </Button>

        <Button
          variant="ghost"
          onClick={() =>
            showToast({
              variant: 'info',
              title: 'New order',
              description: 'Table 3 just placed an order.',
            })
          }
        >
          Show info toast
        </Button>
      </div>

      <div className="p-5 flex flex-wrap gap-5">
        <Button size="lg" variant="primary" onClick={() => console.log('clicked')}>
          <PlusIcon size={18} />
          Btn Lg
        </Button>
        <Button size="md" variant="primary" onClick={() => console.log('clicked')}>
          <PlusIcon size={18} />
          Guardar
        </Button>
        <Button variant="secondary" onClick={() => console.log('clicked')}>
          Guardar
        </Button>
        <Button variant="outline" onClick={() => console.log('clicked')}>
          Guardar
        </Button>
        <Button variant="ghost" onClick={() => console.log('clicked')}>
          Guardar
        </Button>
        <Button variant="danger" onClick={() => console.log('clicked')}>
          Guardar
        </Button>
      </div>

      <div className="p-5 flex flex-col gap-5 max-w-sm">
        <Input size="md" placeholder="Medium" />
        <Input size="lg" placeholder="Large" />

        <Input label="With label" placeholder="Type something..." />

        <Input
          label="With helper text"
          placeholder="you@example.com"
          helperText="We'll never share your email."
        />

        <Input
          label="With error"
          placeholder="Password"
          type="password"
          error="This field is required."
        />

        <Input label="Disabled" placeholder="Can't touch this" disabled />
      </div>

      <div className="p-5 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="success">Ready</Badge>
          <Badge variant="warning">~15 min</Badge>
          <Badge variant="danger">Delayed</Badge>
          <Badge variant="info">New</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge size="sm">Default</Badge>
          <Badge size="sm" variant="success">
            Ready
          </Badge>
          <Badge size="sm" variant="warning">
            ~15 min
          </Badge>
          <Badge size="sm" variant="danger">
            Delayed
          </Badge>
          <Badge size="sm" variant="info">
            New
          </Badge>
        </div>
      </div>

      <div className="p-5 flex flex-wrap gap-5">
        <Button variant="primary" onClick={() => setIsDefaultDialogOpen(true)}>
          Open default confirm
        </Button>

        <Button variant="danger" onClick={() => setIsDangerDialogOpen(true)}>
          Open danger confirm
        </Button>

        <Button variant="outline" onClick={() => setIsLoadingDialogOpen(true)}>
          Open loading confirm
        </Button>
      </div>

      <ConfirmDialog
        open={isDefaultDialogOpen}
        title="Mark order as ready?"
        description="The waiter will be notified that this order is ready to serve."
        confirmText="Mark as ready"
        onConfirm={() => setIsDefaultDialogOpen(false)}
        onCancel={() => setIsDefaultDialogOpen(false)}
      />

      <ConfirmDialog
        open={isDangerDialogOpen}
        variant="danger"
        title="Cancel this order?"
        description="This action can't be undone. The order will be removed from the kitchen queue."
        confirmText="Cancel order"
        cancelText="Keep order"
        onConfirm={() => setIsDangerDialogOpen(false)}
        onCancel={() => setIsDangerDialogOpen(false)}
      />

      <ConfirmDialog
        open={isLoadingDialogOpen}
        title="Send order to kitchen?"
        description="This will notify the kitchen staff immediately."
        confirmText="Send"
        isLoading={isConfirming}
        onConfirm={handleLoadingConfirm}
        onCancel={() => setIsLoadingDialogOpen(false)}
      />
    </div>
  );
}
