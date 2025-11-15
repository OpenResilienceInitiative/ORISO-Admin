import { Resizable } from 'react-resizable';

const ResizableTitle = (props: any) => {
    const { onResize, width, ...restProps } = props;

    if (!width) {
        return <th {...restProps} />;
    }

    return (
        <Resizable
            width={width}
            height={0}
            handle={
                <span
                    role="columnheader"
                    tabIndex={0}
                    className="react-resizable-handle"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                    }}
                />
            }
            onResize={onResize}
            draggableOpts={{
                enableUserSelectHack: false,
            }}
            maxConstraints={[500, 500]}
            minConstraints={[50, 50]}
        >
            <th {...restProps} />
        </Resizable>
    );
};

export default ResizableTitle;
