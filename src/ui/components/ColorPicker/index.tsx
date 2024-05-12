import { useEffect, useRef, useState, type CSSProperties } from "react";
import { OverlayTrigger, Popover } from "react-bootstrap";
import { Sketch } from "./Sketch";

export const ColorPicker = ({
	onClick,
	onChange,
	style,
	value,
}: {
	onClick?: () => void;
	onChange: (hex: string) => void;
	style?: CSSProperties;
	value: string;
}) => {
	const [hex, setHex] = useState(value);

	const ref = useRef<HTMLButtonElement>(null);
	const modalRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (ref.current) {
			modalRef.current = ref.current.closest(".modal");
		}
	}, []);

	return (
		<OverlayTrigger
			trigger="click"
			placement="auto"
			// modalRef is needed until https://github.com/react-bootstrap/react-overlays/issues/1003 is fixed
			container={modalRef.current}
			overlay={
				<Popover>
					<Sketch
						color={hex}
						onChange={color => {
							setHex(color.hex);
							onChange(color.hex);
						}}
					/>
				</Popover>
			}
			rootClose
		>
			<button
				className="btn btn-link"
				onClick={onClick}
				style={{
					...style,
					backgroundColor: hex,
				}}
				type="button"
				ref={ref}
			/>
		</OverlayTrigger>
	);
};
