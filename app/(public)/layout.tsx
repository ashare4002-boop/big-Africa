import { ReactNode } from 'react';
import { Navbar } from './_components/Navbar';
import { SubscriptionWarningNotification } from '@/components/subscription/subscription-warning-badge';

export default function LayoutPublic({children}: { children: ReactNode}) {
 return (
    <div>
        <Navbar/>
        <div className='container mx-auto px-4 md:px-6 lg:px-8 mt-4 mb-4'>
            <SubscriptionWarningNotification />
        </div>
        <main className='container mx-auto px-4 md:px-6 lg:px-8 mb-32'>{children}</main> 
    </div>
 )   
}