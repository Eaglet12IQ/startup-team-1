import { TextBlock } from '../../../shared/modules/text';
import { ImageBlock } from '../../../shared/modules/image';

const COMPONENTS: Record<string, React.ComponentType<any>> = {
    text: TextBlock,
    image: ImageBlock,
};

function App() {
    const slideData = {
        blocks: [
            { type: "text", id: "1", content: "Заголовок", x: '50%', y: 10, width: 200, height: 50 },
            { type: "image", id: "2", src: "https://via.placeholder.com/200", x: 10, y: 70, width: 200, height: 200 },
        ]
    };

    const Canvas = ({ blocks }: { blocks: any[] }) => {
        return (
            <div className="relative">
                {blocks.map((block) => {
                    const Component = COMPONENTS[block.type];
                    if (!Component) return null;
                    return <Component key={block.id} {...block} />;
                })}
            </div>
        )
    }

    return (
        <>
            <div className="border w-96 h-96">
                <Canvas blocks={slideData.blocks} />
            </div>
        </>
    )
}

export default App