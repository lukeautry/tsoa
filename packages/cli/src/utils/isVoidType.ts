import { Tsoa } from '@namecheap/tsoa-runtime';

export const isVoidType = (type: Tsoa.Type): boolean => {
  if (type.dataType === 'void' || type.dataType === 'undefined') {
    return true;
  } else if (type.dataType === 'refAlias') {
    return isVoidType(type.type);
  } else {
    return false;
  }
};
