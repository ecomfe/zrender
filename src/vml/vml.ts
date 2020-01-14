// @ts-nocheck

import './graphic';
import {registerPainter} from '../zrender';
import Painter from './Painter';

registerPainter('vml', Painter);