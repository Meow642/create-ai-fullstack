import { itemApiContracts } from '../items/contracts';
import { registry } from './registry';

Object.values(itemApiContracts).forEach((contract) => registry.registerPath(contract));
