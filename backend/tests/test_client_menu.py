from app.models.buffet_item import BuffetItem
from app.models.tag import Tag
from app.models.tag_item import TagItem

# tests for the client menu endpoints, including filtering, pagination, and data integrity
# Verifies that every public catalogue endpoint returns its reference data.
def test_catalogue_lists_reference_data(
    client, db_session, make_buffet, make_menu_item
):
    buffet = make_buffet()
    item = make_menu_item()
    tag = Tag(name="Spicy catalogue test", alias="spicy-catalogue-test")
    db_session.add(tag)
    db_session.flush()
    db_session.add_all(
        [
            BuffetItem(buffet_id=buffet.id, menu_item_id=item.id),
            TagItem(menu_item_id=item.id, tag_id=tag.id),
        ]
    )
    db_session.commit()

    assert client.get("/api/client/buffets").json()[0]["id"] == buffet.id
    assert client.get("/api/client/categories").json()[0]["id"] == item.category_id
    assert client.get("/api/client/tags").json()[0]["id"] == tag.id
    buffet_items = client.get(f"/api/client/buffets/{buffet.id}/items").json()
    assert [entry["id"] for entry in buffet_items] == [item.id]
    assert buffet_items[0]["tags"][0]["alias"] == tag.alias

# tests for the client menu endpoints, including filtering, pagination, and data integrity
# Verifies that menu search, filters, and pagination select the expected items.
def test_menu_filters_and_paginates(
    client, db_session, make_buffet, make_menu_item
):
    buffet = make_buffet()
    matching = make_menu_item()
    matching.name = "Unique Soup Test"
    matching.description = "fresh tomato"
    other = make_menu_item()
    other.is_available = False
    tag = Tag(name="Soup tag test", alias="soup-tag-test")
    db_session.add(tag)
    db_session.flush()
    db_session.add_all(
        [
            TagItem(menu_item_id=matching.id, tag_id=tag.id),
            BuffetItem(buffet_id=buffet.id, menu_item_id=matching.id),
        ]
    )
    db_session.commit()

    cases = [
        {"search": "tomato"},
        {"category_id": matching.category_id},
        {"is_available": "true"},
        {"tag": tag.alias.upper()},
        {"buffet_id": buffet.id},
    ]
    for params in cases:
        page = client.get("/api/client/menu-items", params=params)
        assert page.status_code == 200
        assert matching.id in [entry["id"] for entry in page.json()["items"]]

    paged = client.get("/api/client/menu-items", params={"limit": 1, "offset": 1})
    assert paged.status_code == 200
    assert paged.json()["limit"] == 1
    assert paged.json()["offset"] == 1
    assert len(paged.json()["items"]) == 1

# tests for the client menu endpoints, including filtering, pagination, and data integrity
# Verifies that missing menu items and buffets return a not-found response.
def test_menu_item_and_buffet_not_found(client):
    assert client.get("/api/client/menu-items/999999").status_code == 404
    assert client.get("/api/client/buffets/999999/items").status_code == 404

# tests for the client menu endpoints, including filtering, pagination, and data integrity
# Verifies that invalid pagination and category filters are rejected.
def test_menu_filter_validation(client):
    assert client.get("/api/client/menu-items", params={"limit": 0}).status_code == 422
    assert client.get("/api/client/menu-items", params={"offset": -1}).status_code == 422
    assert client.get("/api/client/menu-items", params={"category_id": 0}).status_code == 422
