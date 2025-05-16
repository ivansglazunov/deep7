import { Deep, deep, _Relation } from '.';

describe('relations', () => {
  it('strict', () => {
    const MyRelation = new deep.Relation();
    expect(MyRelation).toBeInstanceOf(Deep);
    expect(MyRelation.One).toBeInstanceOf(Function);
    expect(MyRelation.Many).toBeInstanceOf(Function);
  });
  it('lifecicle', () => {
    const Item = new deep();
    Item.My = new deep.Relation();

    Item.myOne = Item.My.One();
    Item.myMany = Item.My.Many();

    const i1 = new Item();
    const i2 = new Item();
    const i3 = new Item();

    expect(i1.myOne).toBeInstanceOf(Deep);
    expect(i1.myOne.symbol).toBe(deep.undefined.symbol);
    expect(i1.myOne.data).toBe(undefined);

    expect(i2.myMany).toBeInstanceOf(Deep);
    expect(i2.myMany.data).toBeInstanceOf(Set);
    expect(i2.myMany.data.size).toBe(0);

    i1.myOne = i2;

    expect(i1.myOne).toBeInstanceOf(Deep);
    expect(i1.myOne.symbol).toBe(i2.symbol);

    expect(i2.myMany).toBeInstanceOf(Deep);
    expect(i2.myMany.data.size).toBe(1);
    expect(i2.myMany.data.has(i1.symbol)).toBe(true);

    delete i1.myOne;

    expect(i1.myOne).toBeInstanceOf(Deep);
    expect(i1.myOne.symbol).toBe(deep.undefined.symbol);
    expect(i1.myOne.data).toBe(undefined);

    expect(i2.myMany).toBeInstanceOf(Deep);
    expect(i2.myMany.data).toBeInstanceOf(Set);
    expect(i2.myMany.data.size).toBe(0);
  });
});
