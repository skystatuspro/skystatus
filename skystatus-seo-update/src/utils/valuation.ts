import { 
    AlertTriangle, 
    CheckCircle2, 
    Sparkles, 
    XCircle, 
    Minus, 
    Trophy 
} from 'lucide-react';

export const getValuationStatus = (actualCpm: number, targetCpm: number, acquisitionCost: number) => {
    // 1. Harde check: Verlies je geld? (Onder inkoopprijs)
    // We gebruiken een kleine buffer (epsilon) voor floating point errors
    if (actualCpm < acquisitionCost - 0.0001) {
        return {
            label: 'LOSS',
            color: 'text-red-700 bg-red-50 border-red-200',
            icon: XCircle,
            hex: '#ef4444', // Red-500
            description: 'Value is lower than acquisition cost. You are losing money.'
        };
    }

    // 2. Bereken ratio t.o.v. doel
    // Fallback: als target 0 is (user error), gebruik acquisition cost als bodem
    const effectiveTarget = targetCpm > 0 ? targetCpm : acquisitionCost;
    const ratio = effectiveTarget > 0 ? actualCpm / effectiveTarget : 0;

    if (ratio < 0.8) return {
        label: 'POOR',
        color: 'text-orange-700 bg-orange-50 border-orange-200',
        icon: AlertTriangle,
        hex: '#f97316', // Orange-500
        description: 'Significantly below your target CPM.'
    };
    
    if (ratio < 1.0) return {
        label: 'ACCEPTABLE',
        color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
        icon: Minus,
        hex: '#eab308', // Yellow-500
        description: 'Close to target, but slightly under.'
    };
    
    if (ratio < 1.5) return {
        label: 'GOOD',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        icon: CheckCircle2,
        hex: '#3b82f6', // Blue-500
        description: 'Solid redemption, meets or exceeds target.'
    };
    
    if (ratio < 2.5) return {
        label: 'EXCELLENT',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        icon: Sparkles,
        hex: '#10b981', // Emerald-500
        description: 'High value, well above target.'
    };

    return {
        label: 'LEGENDARY',
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        icon: Trophy,
        hex: '#a855f7', // Purple-500
        description: 'Exceptional value. A unicorn redemption!'
    };
};