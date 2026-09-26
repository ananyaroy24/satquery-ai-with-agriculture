import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader, random_split
import os

def main():
    # Setup device
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Data augmentation and normalization for training
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    data_dir = './data'
    os.makedirs(data_dir, exist_ok=True)
    
    print("Downloading/Loading EuroSAT dataset... This might take a few minutes.")
    try:
        # Download EuroSAT dataset directly using torchvision
        full_dataset = datasets.EuroSAT(root=data_dir, download=True, transform=transform)
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        print("Please ensure you have an active internet connection.")
        return

    # Split dataset into 80% train and 20% validation
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)

    class_names = ['AnnualCrop', 'Forest', 'HerbaceousVegetation', 'Highway', 
                   'Industrial', 'Pasture', 'PermanentCrop', 'Residential', 
                   'River', 'SeaLake']
    
    print(f"Dataset loaded successfully! Total images: {len(full_dataset)}")
    print(f"Classes: {class_names}")

    # Load a pre-trained ResNet18 and modify it for our 10 EuroSAT classes
    print("Initializing ResNet18 model...")
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    
    # Freeze earlier layers (optional, but speeds up training)
    for param in model.parameters():
        param.requires_grad = False
        
    # Replace the final layer
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, len(class_names))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.fc.parameters(), lr=0.001)

    num_epochs = 5
    print(f"Starting training for {num_epochs} epochs...")

    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for i, (inputs, labels) in enumerate(train_loader):
            inputs, labels = inputs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            if i % 10 == 9:
                print(f"Epoch [{epoch+1}/{num_epochs}], Step [{i+1}/{len(train_loader)}], Loss: {running_loss/10:.4f}, Accuracy: {100.*correct/total:.2f}%")
                running_loss = 0.0

        # Validation phase
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()
        
        print(f"--- Epoch {epoch+1} Validation Accuracy: {100.*val_correct/val_total:.2f}% ---")

    # Save the trained model
    torch.save(model.state_dict(), 'eurosat_model.pth')
    print("Training complete! Model saved as 'eurosat_model.pth'.")

if __name__ == '__main__':
    main()
