import { cn } from "../../lib/utils";

export function Card({ className, children, ...props }) {
    return (
        <div
            className={cn("card bg-[var(--color-card)] shadow-sm", className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children, ...props }) {
    return <div className={cn("flex flex-col space-y-1.5 p-0 mb-5", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }) {
    return <h3 className={cn("text-[15px] font-semibold leading-none tracking-tight text-[var(--color-text-primary)]", className)} {...props}>{children}</h3>;
}


export function CardContent({ className, children, ...props }) {
    return <div className={cn("p-0 pt-0", className)} {...props}>{children}</div>;
}

export function CardDescription({ className, children, ...props }) {
    return <p className={cn("text-sm text-[var(--color-text-secondary)]", className)} {...props}>{children}</p>;
}
