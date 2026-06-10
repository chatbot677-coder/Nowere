export const forwardChat = async (messages) => {
  const getConversationText = () => {
    return messages
      .map((msg) => {
        const speaker = msg.role === "user" ? "You" : "Assistant";
        return `${speaker}: ${msg.content}`;
      })
      .join("\n\n");
  };

  if (!messages.length) {
    alert("No chat selected to forward.");
    return;
  }

  const recipient = window.prompt("Enter recipient email or name to forward this chat:");
  if (!recipient) return;

  const allText = getConversationText();
  try {
    await navigator.clipboard.writeText(allText);
    alert(`Conversation copied. Paste it to forward to ${recipient}.`);
  } catch (err) {
    console.error(err);
    alert("Unable to copy conversation. Please try again.");
  }
};
