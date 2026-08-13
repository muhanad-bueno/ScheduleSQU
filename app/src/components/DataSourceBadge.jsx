import { BarChart3 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function DataSourceBadge() {
    const { t } = useLanguage();
    return (
        <div className="data-badge">
            <span>
                <BarChart3 size={14} />
            </span>
            <span>{t.dataUpdate}</span>
        </div>
    );
}
