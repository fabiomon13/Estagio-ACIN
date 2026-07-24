from app.db.session import SessionLocal
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.guest import Guest

def seed_orders() -> None:

    """Creates a sample order with a 'Ready' item for testing."""

    with SessionLocal() as db:
        # Fetch a guest to associate with the order
        guest = db.query(Guest).first()
        if not guest:
            print("No guests found. Please seed guests first.")
            return

        menu_item = db.query(MenuItem).first()
        item_id = menu_item.id if menu_item else 1
        

        # Create a new order for the guest
        new_order = Order(guest_id=guest.id, round_number=1)
        db.add(new_order)
        db.commit()
        db.refresh(new_order)

        new_order_item = OrderItem(
           order_id=new_order.id,
           item_id=item_id,
           status_id=3,  # Assuming '3' corresponds to 'Ready'
           quantity=1,
           unit_price=10.00,
           unit_price_at_order=10.00
       )

        db.add(new_order_item)
        db.commit()

        print("Successfully seeded a 'Ready' order item!")

if __name__ == "__main__":
    seed_orders()