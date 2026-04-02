import { ScrollView, Pressable, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const EMOJIS = [
  // Comida y bebida
  '🍽️','🛒','🍔','🍕','🍣','☕','🍺','🍰','🥗','🥤','🌮','🍜',
  '🌯','🥙','🥚','🧇','🥞','🧆','🥓','🌭','🍟','🍗','🍖','🥩',
  '🦞','🦐','🦑','🍤','🥟','🥠','🍱','🍛','🍲','🍣','🍤','🥮',
  '🍩','🍪','🎂','🍮','🍭','🍬','🍫','🍿','🧃','🥛','🍵','🧋',
  '🍷','🍸','🍹','🧉','🥂','🍾','🫖','🧊',
  // Transporte
  '🚗','🚌','🚇','✈️','🚴','🛵','⛽','🚕','🚂','🛳️','🏍️','🛺',
  '🚁','🛸','🚀','⛵','🚤','🛶','🚠','🚡','🛤️','🛣️','⛽','🅿️',
  // Salud y deporte
  '💊','🏥','🧘','🏋️','🩺','🦷','💉','🩹','🥊','🧬','🌡️','🫀',
  '🏃','🚶','🧗','🤸','⛹️','🏊','🚵','🤾','🏌️','🎽','👟','🩺',
  // Entretenimiento
  '🎮','🎬','🎵','🎭','📚','🎲','🎸','🏆','🎯','🎤','🎨','🎪',
  '🎻','🥁','🎺','🪗','🎹','🎧','🎷','🎰','🃏','🎴','♟️','🧩',
  '🏈','⚽','🏀','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥋','🎿',
  // Compras y moda
  '🛍️','👗','👟','💄','💍','📱','💻','📷','⌚','🎒','👓','🕶️',
  '👠','👡','👒','🎩','🧢','👜','👝','🧳','💼','👔','🧥','🧣',
  // Hogar
  '🏠','🛋️','💡','🔧','🪴','🔑','🧹','🪟','🛏️','🚿','🧺','🫧',
  '🧴','🪥','🧻','🚽','🛁','🪑','🪞','🖼️','🛒','🧯','🔌','💻',
  // Dinero y trabajo
  '💰','💳','💵','🏦','📈','💼','📋','✏️','📎','🖥️','📊','💸',
  '🏧','💹','🪙','💱','📉','🤑','💲','🧾','🗂️','📁','✂️','🖊️',
  // Personas y vida
  '👶','🐾','🎁','🤲','🎓','❤️','👨‍👩‍👧','🧒','👴','👵','🤝','🙏',
  '💪','🧠','👁️','👂','🦷','🦴','🤰','👼','🎅','🧑‍💻','👩‍⚕️','👨‍🍳',
  // Naturaleza y clima
  '🌳','🌸','🌺','🌻','🌊','🔥','⭐','🌙','☀️','🌈','❄️','⛈️',
  // Símbolos y otros
  '🌟','🔴','🟢','🟡','🔵','⚫','🟣','🟤','🔶','🔷','✅','❌',
  '⚠️','💬','📍','🏷️','🔖','📌','📍','🗓️','⏰','⏳','🔔','💎',
] as const;

interface Props {
  selected: string;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ selected, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ maxHeight: 200 }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {EMOJIS.map((item, index) => {
          const isSelected = item === selected;
          return (
            <Pressable
              key={index}
              onPress={() => onSelect(item)}
              style={{
                width: 42,
                height: 42,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 21,
                backgroundColor: isSelected ? colors.primary : 'transparent',
                margin: 2,
              }}
            >
              <Text style={{ fontSize: 20 }}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
