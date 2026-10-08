import { sessionHandlers } from './session';
import { nftHandlers } from './nfts';
import { favoriteHandlers } from './favorites';
import { cartHandlers, guestCartHandlers } from './cart';
import { orderHandlers } from './orders';
import { profileHandlers, debugUserHandlers } from './profile';
import { walletHandlers } from './wallets';
import { debugHandlers } from './debug';

export const handlers = [
  ...sessionHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...guestCartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  ...debugHandlers,
  ...debugUserHandlers,
];