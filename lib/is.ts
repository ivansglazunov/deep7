import { _Data } from "./_data";
import { z } from "zod";
import { _Reason } from "./deep";

export function newIs(deep) {
  const Is = new deep.Method(function(this: any, value: any) {
    let v;
    if (value instanceof deep.Deep) v = value;
    else v = new deep(value);
    return this._source._id === v._id;
  });

  return Is;
}