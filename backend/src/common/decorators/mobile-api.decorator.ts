import { SetMetadata } from '@nestjs/common';

export const MOBILE_API_KEY = 'isMobileApi';
export const MobileApi = () => SetMetadata(MOBILE_API_KEY, true);

