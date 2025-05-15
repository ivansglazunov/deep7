import { Deep, deep } from '.';

describe('relations', () => {
  it.skip('lifecicle', () => {
    const MyRelations = new deep.Relations();
    expect(MyRelations.prev).toBe(deep.Relations.symbol);
    expect(MyRelations.prevBy).toBe(deep.construct);
    expect(MyRelations.context.__proto__).toBe(deep.Relations.context);

    const Item = new deep();
    Item.My = new deep.Relations();

    // Item.myOne = new Item.One(Item.My.symbol);
    // Item.myMany = new Item.Many(Item.My.symbol);
    Item.myOne = new Item.One(Item.My.symbol);
    Item.myMany = new Item.Many(Item.My.symbol);

    console.log('Item.myOne.prev', Item.myOne.prev);

    const i1 = new Item();
    const i2 = new Item();
    const i3 = new Item();

    expect(i1.myOne()).toBe(undefined);
    console.log(i1.myMany());
    // expect(i1.myMany()).toBeInstanceOf(deep.Set);

    i1.myOne(i2);
    expect(i1.myOne()).toBe(i2);
  });
});
