import { useState } from 'react';
import Button from '../../../components/ui/button/Button';
import { PlusIcon } from '../../../components/icons';
import Input from '../../../components/ui/input/Input';
import Badge from '../../../components/ui/badge/Badge';
import ConfirmDialog from '../../../components/ui/confirm-dialog/ConfirmDialog';

export function KitchenPage() {
  const [isDefaultDialogOpen, setIsDefaultDialogOpen] = useState(false);
  const [isDangerDialogOpen, setIsDangerDialogOpen] = useState(false);
  const [isLoadingDialogOpen, setIsLoadingDialogOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleLoadingConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      setIsLoadingDialogOpen(false);
    }, 1500);
  };

  return (
    <div className="bg-">
      <h1>Kitchen</h1>
      <div className="p-5 flex gap-5">
        <Button variant="primary" onClick={() => console.log('clicked')}>
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
        <Input size="sm" placeholder="Small" />
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
        <div className="flex items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="success">Ready</Badge>
          <Badge variant="warning">~15 min</Badge>
          <Badge variant="danger">Delayed</Badge>
          <Badge variant="info">New</Badge>
        </div>

        <div className="flex items-center gap-3">
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

      <div className="p-5 flex gap-5">
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
