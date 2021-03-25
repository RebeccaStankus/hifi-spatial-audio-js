gpg --quiet --batch --yes --decrypt --passphrase="$TESTING_AUTH_DECRYPTION_KEY" \
--output $HOME/tests/secrets/auth.json.gpg