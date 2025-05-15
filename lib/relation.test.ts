import { Deep, deep, _Relation } from '.';

describe('relations', () => {
  it('strict', () => {
    const MyRelations = new deep.Relations();
    expect(typeof MyRelations).toBe('object');
    expect(MyRelations._relation).toBeInstanceOf(_Relation);
    expect(MyRelations.one).toBeInstanceOf(Function);
    expect(MyRelations.many).toBeInstanceOf(Function);
  });
  it('lifecicle', () => {
    const Item = new deep();
    Item.My = new deep.Relations();

    Item.myOne = Item.My.one;
    Item.myMany = Item.My.many;

    const i1 = new Item();
    const i2 = new Item();
    const i3 = new Item();

    expect(i1.myOne()).toBeInstanceOf(Deep);
    expect(i1.myOne().symbol).toBe(deep.undefined.symbol);
    expect(i1.myOne().data).toBe(undefined);

    expect(i2.myMany()).toBeInstanceOf(Deep);
    expect(i2.myMany().data).toBeInstanceOf(Set);
    expect(i2.myMany().data.size).toBe(0);

    i1.myOne(i2);

    expect(i1.myOne()).toBeInstanceOf(Deep);
    expect(i1.myOne().symbol).toBe(i2.symbol);

    expect(i2.myMany()).toBeInstanceOf(Deep);
    expect(i2.myMany().data.size).toBe(1);
    expect(i2.myMany().data.has(i1.symbol)).toBe(true);

    i1.myOne(undefined);

    expect(i1.myOne()).toBeInstanceOf(Deep);
    expect(i1.myOne().symbol).toBe(deep.undefined.symbol);
    expect(i1.myOne().data).toBe(undefined);

    expect(i2.myMany()).toBeInstanceOf(Deep);
    expect(i2.myMany().data).toBeInstanceOf(Set);
    expect(i2.myMany().data.size).toBe(0);
  });
});
