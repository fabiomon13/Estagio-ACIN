# Kitchen board should only flag an allergen on an item when the guest who
# ordered it actually declared that allergy -- not just because the dish
# happens to contain it (that was the old, always-on behavior).

from app.models.guest import Guest
from app.models.tag import Tag
from app.models.tag_item import TagItem


def _make_allergen_tag(db_session, alias: str, name: str) -> Tag:
    tag = Tag(name=name, alias=alias)
    db_session.add(tag)
    db_session.commit()
    return tag


def _link_tag_to_menu_item(db_session, menu_item, tag: Tag) -> None:
    db_session.add(TagItem(menu_item_id=menu_item.id, tag_id=tag.id))
    db_session.commit()


def test_flags_the_allergen_when_the_ordering_guest_declared_it(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    fish_tag = _make_allergen_tag(db_session, "alergenio-peixe", "Alergénio: peixe")
    dish = make_menu_item()
    _link_tag_to_menu_item(db_session, dish, fish_tag)

    guest = make_guest()
    guest.allergy_tags = [fish_tag]
    db_session.add(guest)
    db_session.commit()

    order = make_order(guest=guest)
    make_order_item(order=order, menu_item=dish)

    response = client.get("/api/kitchen/tickets")

    assert response.status_code == 200
    items = response.json()[0]["items"]
    assert items[0]["matched_allergens"] == ["Alergénio: peixe"]


def test_does_not_flag_an_allergen_the_guest_never_declared(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    fish_tag = _make_allergen_tag(db_session, "alergenio-peixe", "Alergénio: peixe")
    dish = make_menu_item()
    _link_tag_to_menu_item(db_session, dish, fish_tag)

    # This guest never declared any allergy -- the dish still has the tag,
    # but nothing should be flagged for them.
    guest = make_guest()

    order = make_order(guest=guest)
    make_order_item(order=order, menu_item=dish)

    response = client.get("/api/kitchen/tickets")

    assert response.status_code == 200
    items = response.json()[0]["items"]
    assert items[0]["matched_allergens"] == []
    # The dish's own tags are still visible -- only the "does this match a
    # real allergy" signal changed, not the informational tag list itself.
    assert items[0]["tags"] == ["Alergénio: peixe"]


def test_status_update_response_also_reflects_the_match(
    client, login_as, make_staff, db_session,
    order_item_statuses, staff_roles,
    make_guest, make_order, make_order_item, make_menu_item,
):
    chef = make_staff(role_name="Chef")
    login_as(chef)

    nut_tag = _make_allergen_tag(db_session, "alergenio-frutos-de-casca-rija", "Alergénio: frutos de casca rija")
    dish = make_menu_item()
    _link_tag_to_menu_item(db_session, dish, nut_tag)

    guest = make_guest()
    guest.allergy_tags = [nut_tag]
    db_session.add(guest)
    db_session.commit()

    order = make_order(guest=guest)
    item = make_order_item(order=order, menu_item=dish)

    response = client.patch(f"/api/kitchen/order-items/{item.id}/status", json={"status": "Preparing"})

    assert response.status_code == 200
    assert response.json()["matched_allergens"] == ["Alergénio: frutos de casca rija"]
