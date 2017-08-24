#!/usr/bin/env python
# -*- coding: utf-8 -*-

n_common = 20000
common_words = set()

with open('en_freq/en_50k.txt', 'rb') as file:
	i = 0
	for line in file:
		i += 1

		word, freq = line.split(' ')
		common_words.add(word)

		if i >= n_common:
			break

forword = dict()

with open('cmudict/cmudict-0.7b', 'rb') as file:
	for line in file:
		if line[0] != ';':
			word, phones = line.split('  ')
			word = word.lower()

			if word not in common_words:
				continue

			phones = phones.translate(None, '0123456789\n')
			if forword.has_key(word):
				print 'DUPLICATE KEY: %s' % word
			else:
				forword[word] = phones

reversed_phonemes = {
	# diphthongs
	'EY': ['Y', 'EH'], # (IY EH)
	'AY': ['Y', 'AA'], # (IY AA)
	'OW': ['W', 'AH'], # ???
	'AW': ['W', 'AE'],
	'OY': ['Y', 'AO'], # (IY, AO)

	'ER': 
}

def reverse(phones):
	phones = phones.split(' ')
	phones.reverse()
	updated_phones = []
	for phoneme in phones:
		if reversed_phonemes.has_key(phoneme):
			updated_phones.extend(reversed_phonemes[phoneme])
		else:
			updated_phones.append(phoneme)
	updated_phones = ' '.join(updated_phones)
	return updated_phones

forword_keys = forword.keys()
forword_values = forword.values()

for word, phones in forword.items():
	senohp = reverse(phones)
	
	try:
		index = forword_values.index(senohp)
	except ValueError:
		index = -1
	
	word2 = forword_keys[index]

	if index != -1 and word == word2:
		print '%s – %s :: %s – %s' % (word, phones, senohp, word2)
