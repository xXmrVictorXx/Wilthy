import blackLogo from '../../../../assets/Wilthy_black_bg.svg';
import whiteLogo from '../../../../assets/Wilthy_white_bg.svg';
import { cn } from '../../../ui/lib/cn';

export function WilthyBrand({ alt = 'Wilthy', className }: { alt?: string; className?: string }) {
  return (
    <span className={cn('inline-grid', className)}>
      <img
        alt={alt}
        className="wilthy-brand-light col-start-1 row-start-1 h-full w-auto"
        src={whiteLogo}
      />
      <img
        alt=""
        aria-hidden="true"
        className="wilthy-brand-dark col-start-1 row-start-1 h-full w-auto"
        src={blackLogo}
      />
    </span>
  );
}
