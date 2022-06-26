function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

class historyManager {
    history = [];
    index = -1;

    push(text, type, line, char, line_end, char_end) {
        this.index++;
        this.history.length = this.index;
        this.history.push({ text: text, type: type, line: line, char: char, line_end: line_end, char_end: char_end });
    }

    undo() {
        const ret = this.index > -1 ? this.history[clamp(this.index, 0, this.history.length)] : null;
        if (this.index > -1) this.index--;
        return ret;
    }

    redo() {
        const ret = this.index > -1 ? this.history[clamp(this.index + 1, 0, this.history.length)] : null;
        this.index = clamp(this.index + 1, -1, this.history.length);
        return ret;
    }
}

export default historyManager;
export { historyManager };
