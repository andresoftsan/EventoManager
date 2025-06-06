import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

interface TempChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

interface TempChecklistTabProps {
  items: TempChecklistItem[];
  onItemsChange: (items: TempChecklistItem[]) => void;
}

export default function TempChecklistTab({ items, onItemsChange }: TempChecklistTabProps) {
  const [newItemTitle, setNewItemTitle] = useState("");

  const addItem = () => {
    if (newItemTitle.trim()) {
      const newItem: TempChecklistItem = {
        id: Date.now().toString(),
        title: newItemTitle.trim(),
        completed: false,
      };
      onItemsChange([...items, newItem]);
      setNewItemTitle("");
    }
  };

  const toggleItem = (id: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onItemsChange(updatedItems);
  };

  const removeItem = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    onItemsChange(updatedItems);
  };

  const updateItemTitle = (id: string, title: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, title } : item
    );
    onItemsChange(updatedItems);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite o item do checklist..."
          className="flex-1"
        />
        <Button 
          type="button"
          onClick={addItem} 
          disabled={!newItemTitle.trim()}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum item no checklist</p>
            <p className="text-sm">Adicione itens acima para começar</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg">
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => toggleItem(item.id)}
              />
              <Input
                value={item.title}
                onChange={(e) => updateItemTitle(item.id, e.target.value)}
                className="flex-1 border-none shadow-none p-0 h-auto"
                placeholder="Título do item"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="text-sm text-gray-600">
          Total: {items.length} itens • Concluídos: {items.filter(item => item.completed).length}
        </div>
      )}
    </div>
  );
}