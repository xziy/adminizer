interface AppContentProps{
    message?: string;
}

export default function ComponentA({message}: AppContentProps) {
    return <div>Компонент A: {message}</div>;
}
